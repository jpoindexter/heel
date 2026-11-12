import { DebugInfoSchema } from "../../shared/api";
import { APP_VERSION } from "../../shared/version";
import { DiagnosticsSchema, type Diagnostics } from "../../shared/reports";
import type { Client } from "../api/client";
import { readDebugLog, type DebugEntry } from "./debug-log";

/** Raw errors and helper logs can contain private text. Send only fixed event categories. */
function event(entry: DebugEntry): Diagnostics["events"][number] {
  const areas = ["panel", "mascot", "notice", "layers", "helper"] as const;
  const area = areas.find(a => a === entry.where) ?? "unknown";
  const helper = area === "helper" && /^(starting|running|restarting|stopped)(:|$)/.exec(entry.text)?.[1];
  const name = helper ? `helper_${helper}` : area === "layers" ? "view_changed" : entry.level === "error" ? "error" : "view_changed";
  return { at: entry.at, level: entry.level, area, event: name as Diagnostics["events"][number]["event"] };
}

export async function reportDiagnostics(client: Client, crashed = false): Promise<Diagnostics> {
  const response = await client.get("/debug", DebugInfoSchema);
  const helper = response.ok ? response.data : null;
  return DiagnosticsSchema.parse({
    version: APP_VERSION, os: helper?.os ?? "Unavailable", helperReached: !!helper,
    node: helper?.node ?? null, database: helper?.migration ?? null, provider: helper?.provider ?? null,
    attention: helper?.attention ?? null, counts: helper?.counts ?? null, crashed,
    events: readDebugLog().slice(-80).map(event),
  });
}
