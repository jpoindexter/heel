import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { release } from "node:os";
import { join } from "node:path";
import type { Hono } from "hono";
import { DebugExportInputSchema } from "../../shared/api";
import { APP_VERSION } from "../../shared/version";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

/** The shell writes it next to the database; must equal SIDECAR_LOG_FILE in src-tauri/src/constants.rs. */
export const SIDECAR_LOG_FILE = "sidecar.log";
const TAIL_LINES = 200;

export type DebugDeps = {
  dataDir: string;
  /** The listening port once the OS has picked it. */
  port: () => number | null;
  /** Where "Export report" writes: the Desktop, so the file is easy to attach anywhere. */
  exportDir: string;
};

/** The last lines of a file, or none when it is missing or unreadable. Never throws. */
export function tailLines(path: string, count = TAIL_LINES): string[] {
  try {
    const lines = readFileSync(path, "utf8").split("\n");
    if (lines.at(-1) === "") lines.pop();
    return lines.slice(-count);
  } catch {
    return [];
  }
}

export const reportFileName = (now: Date): string => `heel-report-${now.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;

const osLine = (): string => (process.platform === "darwin" ? `macOS (Darwin ${release()})` : `${process.platform} ${release()}`);

/** Settings > Debug (N30): the helper's facts, and the report saved as a file. No content, no secrets. */
export function registerDebugRoutes(app: Hono, { store, debug, openFile }: AppDeps): void {
  app.get("/debug", (c) =>
    ok(c, {
      version: APP_VERSION,
      os: osLine(),
      node: process.version,
      port: debug.port(),
      uptimeSec: Math.round(process.uptime()),
      dataDir: debug.dataDir,
      migration: store.schemaVersion(),
      provider: store.settings.getBrain().provider,
      attention: store.settings.getAttention().enabled,
      counts: { tasks: store.tasks.list().length, parked: store.parked.list().length, documents: store.documents.list().length },
      sidecarLog: tailLines(join(debug.dataDir, SIDECAR_LOG_FILE)),
    }),
  );

  // The panel builds the text (the panel log lives there); the helper writes it and shows it in Finder in one go.
  app.post("/debug/export", async (c) => {
    const body = DebugExportInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"text": "the report"}.');
    const path = join(debug.exportDir, reportFileName(new Date()));
    try {
      mkdirSync(debug.exportDir, { recursive: true });
      writeFileSync(path, body.data.text, "utf8");
    } catch (error) {
      return fail(c, "conflict", `Couldn't write ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return ok(c, { path, revealed: await openFile(path, true) });
  });

}
