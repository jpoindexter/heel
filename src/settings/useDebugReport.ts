import { useCallback, useEffect, useState } from "react";
import { DebugExportResultSchema, DebugInfoSchema, type DebugInfoDto } from "../../shared/api";
import type { Client } from "../api/client";
import { clearDebugLog, readDebugLog, type DebugEntry } from "../ui/debug-log";
import { buildReport, copyText } from "../ui/debug-log-report";

const fileName = (path: string): string => path.split("/").pop() ?? path;

/** Settings > About > Debug (N30): the two logs, and the report copied, saved to the Desktop, or cleared. */
export function useDebugReport(client: Client, active: boolean) {
  const [helper, setHelper] = useState<DebugInfoDto | null>(null);
  const [log, setLog] = useState<DebugEntry[]>([]);
  /** The one status line under the buttons: what just happened, in a sentence. */
  const [said, setSaid] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLog(readDebugLog());
    const got = await client.get("/debug", DebugInfoSchema);
    setHelper(got.ok ? got.data : null);
  }, [client]);

  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);

  const report = useCallback(() => buildReport({ helper, log }), [helper, log]);

  const copy = useCallback(async () => {
    setSaid((await copyText(report())) ? "Copied. Paste it anywhere." : "Couldn't copy. Select the log text and copy it yourself.");
  }, [report]);

  const exportFile = useCallback(async () => {
    const saved = await client.post("/debug/export", DebugExportResultSchema, { text: report() });
    if (!saved.ok) return setSaid(saved.error.message);
    setSaid(`Saved to your Desktop as ${fileName(saved.data.path)}.${saved.data.revealed ? "" : " Couldn't show it in Finder."}`);
  }, [client, report]);

  const clear = useCallback(() => {
    clearDebugLog();
    setLog([]);
    setSaid("Panel log cleared.");
  }, []);

  return { helper, log, said, copy, exportFile, clear };
}
