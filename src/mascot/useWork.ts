import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { WORK_EVENT } from "../events";
import { applyWork, isWorking, WORK_MAX_MS, WorkPayloadSchema, type WorkSet } from "./work";

/** Whether Heel is doing something right now, as the panel tells it: begins and ends by id, never stuck for good. */
export function useWork(): boolean {
  const [flights, setFlights] = useState<WorkSet>(() => new Set());
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const forget = (id: string) => {
      window.clearTimeout(timers.current.get(id));
      timers.current.delete(id);
    };
    const unlisten = listen<unknown>(WORK_EVENT, (event) => {
      const parsed = WorkPayloadSchema.safeParse(event.payload);
      if (!parsed.success) return;
      const payload = parsed.data;
      setFlights((current) => applyWork(current, payload));
      forget(payload.id);
      if (payload.active) {
        timers.current.set(
          payload.id,
          window.setTimeout(() => setFlights((current) => applyWork(current, { id: payload.id, active: false })), WORK_MAX_MS),
        );
      }
    }).catch(() => undefined);
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      void unlisten.then((off) => off?.());
    };
  }, []);

  return isWorking(flights);
}
