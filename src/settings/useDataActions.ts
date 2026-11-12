import { useCallback, useState } from "react";
import { BackupResultSchema, DataPreviewSchema, WipeResultSchema, type DataPreviewDto } from "../../shared/data";
import type { Client } from "../api/client";
import { refused, wipeSaid, type Said } from "./data-model";

/** Reload after a wipe so every view starts from the empty helper; long enough to read the sentence first. */
const RELOAD_AFTER_WIPE_MS = 1_500;

const folderName = (path: string): string => path.split("/").pop() ?? path;

/** Privacy & data (N4): a backup folder on the Desktop, and the wipe behind its preview and typed phrase. */
export function useDataActions(client: Client) {
  const [preview, setPreview] = useState<DataPreviewDto | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState(false);

  const backup = useCallback(async () => {
    setBusy(true);
    const made = await client.post("/data/backup", BackupResultSchema);
    setBusy(false);
    if (!made.ok) return setSaid(refused(made.error.message));
    setSaid({ text: `Backed up to your Desktop as ${folderName(made.data.path)}.${made.data.revealed ? "" : " Couldn't show it in Finder."}`, tone: "info" });
  }, [client]);

  /** Opening the confirm block fetches what a wipe would remove; the person reads real counts before typing. */
  const startWipe = useCallback(async () => {
    const got = await client.get("/data/preview", DataPreviewSchema);
    if (!got.ok) return setSaid(refused(got.error.message));
    setPreview(got.data);
  }, [client]);

  const cancelWipe = useCallback(() => setPreview(null), []);

  const wipe = useCallback(
    async (confirm: string) => {
      setBusy(true);
      const done = await client.post("/data/wipe", WipeResultSchema, { confirm });
      setBusy(false);
      if (!done.ok) return setSaid(refused(done.error.message));
      try { for (const key of ["heel:feedback-draft-v1", "heel:report-pending:debug", "heel:report-pending:crash", "heel:onboarding-task-draft"]) localStorage.removeItem(key); } catch { /* storage may be unavailable */ }
      setPreview(null);
      setSaid(wipeSaid(done.data));
      window.setTimeout(() => window.location.reload(), RELOAD_AFTER_WIPE_MS);
    },
    [client],
  );

  return { preview, said, busy, backup, startWipe, cancelWipe, wipe };
}
