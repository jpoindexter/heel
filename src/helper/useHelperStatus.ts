import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HELPER_STATUS_EVENT } from "../events";
import { ASSUMED_RUNNING, statusFromPayload, type HelperStatus } from "./status";

/**
 * Whether Heel's helper is running, as the shell sees it. `onRecovered` runs when it comes back after not running,
 * so the panel can reload what it showed (the helper may have a new port and token by then).
 */
export function useHelperStatus(onRecovered: () => void) {
  const [status, setStatus] = useState<HelperStatus>(ASSUMED_RUNNING);
  const [error, setError] = useState<string | null>(null);
  /** How many times it has come back; a changing number lets other views reload. */
  const [recoveries, setRecoveries] = useState(0);
  const was = useRef<HelperStatus["state"]>("running");
  const recovered = useRef(onRecovered);
  recovered.current = onRecovered;

  useEffect(() => {
    const take = (payload: unknown) => {
      const next = statusFromPayload(payload);
      if (!next) return;
      if (next.state === "running" && was.current !== "running") {
        recovered.current();
        setRecoveries((count) => count + 1);
      }
      was.current = next.state;
      setStatus(next);
    };
    void invoke("helper_status").then(take).catch(() => undefined);
    const unlisten = listen<unknown>(HELPER_STATUS_EVENT, (event) => take(event.payload)).catch(() => undefined);
    return () => void unlisten.then((off) => off?.());
  }, []);

  const restart = useCallback(async () => {
    setError(null);
    try {
      await invoke("restart_helper");
    } catch (failure) {
      setError(typeof failure === "string" ? failure : "Couldn't restart the helper.");
    }
  }, []);

  return { status, error, restart, recoveries };
}
