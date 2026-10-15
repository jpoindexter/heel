import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { RUN_EVENT } from "../../events";
import type { MotionId } from "../sheets";
import { runFromPayload } from "./run-event";

/**
 * While the shell moves him off or on screen (hide, show, quit) he runs. Kept apart from his idle life so a
 * hover can't flip him back to sitting in the middle of the run. `wake` is called when the run starts.
 */
export function useRunEvents(wake: () => void): MotionId | null {
  const [running, setRunning] = useState<MotionId | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const unlisten = listen<unknown>(RUN_EVENT, (event) => {
      const run = runFromPayload(event.payload);
      if (!run) return;
      wake();
      setRunning(run.motion);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setRunning(null), run.ms);
    }).catch(() => undefined);
    return () => {
      window.clearTimeout(timer);
      void unlisten.then((off) => off?.());
    };
  }, [wake]);

  return running;
}
