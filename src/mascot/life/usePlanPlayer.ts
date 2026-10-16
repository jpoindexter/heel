import { useCallback, useRef } from "react";
import type { MotionId } from "../sheets";
import { CLIP_MS, MOTIONS } from "./config";
import type { Plan } from "./engine";
import { startWalk, stopWalk, walkFinished } from "./walk";

/** Plays a life plan one step at a time. A newer plan, or `cancel`, ends the one in flight at its next step. */
export function usePlanPlayer(setLifeMotion: (motion: MotionId | null) => void) {
  const running = useRef(0);
  const lastDistance = useRef<number | null>(null);

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
      lastDistance.current = plan.walk?.distancePx ?? null;
      const started = plan.walk && current() ? await startWalk(plan.walk.direction, Math.random, plan.walk.distancePx) : null;
      if (started && current()) {
        setLifeMotion(started.direction === "left" ? MOTIONS.runLeft : MOTIONS.runRight);
        await walkFinished(started.duration_ms);
      }
      if (started && plan.walk?.andBack && current()) await walkBack(started);
      if (current()) setLifeMotion(null);
    },
    [setLifeMotion],
  );

  /** The second leg of a there-and-back: turn around, then the same distance the other way. */
  const walkBack = useCallback(
    async (first: { direction: "left" | "right"; duration_ms: number }) => {
      setLifeMotion(MOTIONS.turnAround);
      await new Promise((resolve) => window.setTimeout(resolve, CLIP_MS.turnAround));
      const back = await startWalk(first.direction === "left" ? "right" : "left", Math.random, lastDistance.current ?? undefined);
      if (!back) return;
      setLifeMotion(back.direction === "left" ? MOTIONS.runLeft : MOTIONS.runRight);
      await walkFinished(back.duration_ms);
    },
    [setLifeMotion],
  );

  const cancel = useCallback(() => {
    running.current += 1;
    stopWalk();
  }, []);

  return { play, cancel };
}
