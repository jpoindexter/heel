import { useCallback, useRef } from "react";
import type { MotionId } from "../sheets";
import { MOTIONS } from "./config";
import type { Plan } from "./engine";
import { startWalk, stopWalk, walkFinished } from "./walk";

/** Plays a life plan one step at a time. A newer plan, or `cancel`, ends the one in flight at its next step. */
export function usePlanPlayer(setLifeMotion: (motion: MotionId | null) => void) {
  const running = useRef(0);

  const play = useCallback(
    async (plan: Plan) => {
      const mine = ++running.current;
      const current = () => running.current === mine;
      for (const step of plan.steps) {
        if (!current()) return;
        setLifeMotion(step.motion);
        if (!Number.isFinite(step.ms)) return;
        await new Promise((resolve) => window.setTimeout(resolve, step.ms));
      }
      const started = plan.walk && current() ? await startWalk(plan.walk.direction, Math.random, plan.walk.distancePx) : null;
      if (started && current()) {
        setLifeMotion(started.direction === "left" ? MOTIONS.runLeft : MOTIONS.runRight);
        await walkFinished(started.duration_ms);
      }
      if (current()) setLifeMotion(null);
    },
    [setLifeMotion],
  );

  const cancel = useCallback(() => {
    running.current += 1;
    stopWalk();
  }, []);

  return { play, cancel };
}
