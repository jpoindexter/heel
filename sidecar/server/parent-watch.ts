/** The shell ends the helper with SIGTERM on a normal quit; a force quit or crash sends nothing, and an orphaned helper would hold the data dir until logout. */
export const PARENT_POLL_MS = 3_000;

type ParentWatch = { parentPid: number; ppid: () => number; onGone: () => void; everyMs?: number };

/** Calls `onGone` once when the parent pid changes (macOS re-parents an orphan to launchd). Returns a stop function. */
export function watchParent({ parentPid, ppid, onGone, everyMs = PARENT_POLL_MS }: ParentWatch): () => void {
  const timer = setInterval(() => {
    if (ppid() === parentPid) return;
    clearInterval(timer);
    onGone();
  }, everyMs);
  timer.unref();
  return () => clearInterval(timer);
}
