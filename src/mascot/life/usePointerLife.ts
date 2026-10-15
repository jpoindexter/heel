import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { POINTER_EVENT } from "../../events";
import type { MotionId } from "../sheets";
import { GAZE_TICK_MS, type Activity } from "./config";
import { GLANCE_START, comeTarget, gazeMotion, glance, pointerFromPayload, rest, returnedAfterIdle, type PointerSample, type RestState } from "./pointer";
import type { Direction } from "./walk";

type Options = {
  activity: Activity;
  /** Nothing else is showing on him and nothing is being done to him. */
  free: boolean;
  reducedMotion: boolean;
  come: (direction: Direction, distancePx: number) => void;
  stretch: () => void;
};

type Memory = { sample: PointerSample | null; glance: typeof GLANCE_START; rest: RestState | null; lastMoveAt: number };

/**
 * What the pointer does to Greg (N25): his gaze follows it while it is near (a glance when Calm, a steady look when
 * Lively), he comes over when it rests low on the screen a stride away (Lively), and the first move after a long
 * quiet stretch earns a stretch. Returns the look to show, or null.
 */
export function usePointerLife({ activity, free, reducedMotion, come, stretch }: Options): MotionId | null {
  const [gaze, setGaze] = useState<MotionId | null>(null);
  const latest = useRef({ activity, free, reducedMotion, come, stretch });
  latest.current = { activity, free, reducedMotion, come, stretch };
  const memory = useRef<Memory>({ sample: null, glance: GLANCE_START, rest: null, lastMoveAt: Date.now() });

  const look = useCallback(() => {
    const m = memory.current;
    const target = m.sample && latest.current.free ? gazeMotion(m.sample) : null;
    const next = glance(m.glance, Date.now(), target, latest.current.activity);
    m.glance = next.state;
    setGaze((shown) => (shown === next.show ? shown : next.show));
  }, []);

  useEffect(() => {
    const unlisten = listen<unknown>(POINTER_EVENT, (event) => {
      const sample = pointerFromPayload(event.payload);
      if (!sample) return;
      const now = Date.now();
      const m = memory.current;
      const { activity: mode, free: isFree, reducedMotion: reduced, come: comeOver, stretch: stretchNow } = latest.current;
      if (returnedAfterIdle(m.lastMoveAt, now)) stretchNow();
      m.lastMoveAt = now;
      m.sample = sample;
      look();
      const rested = rest(m.rest, sample, now);
      m.rest = rested.state;
      if (rested.rested && mode === "lively" && isFree && !reduced) {
        m.rest = { ...rested.state, served: true };
        const target = comeTarget(sample);
        if (target) comeOver(target.direction, target.distancePx);
      }
    }).catch(() => undefined);
    const tick = window.setInterval(look, GAZE_TICK_MS);
    return () => {
      window.clearInterval(tick);
      void unlisten.then((off) => off?.());
    };
  }, [look]);

  return free ? gaze : null;
}
