import { useCallback, useRef } from "react";
import { COME_COOLDOWN_MS, LEAD_IN_MS, MOTIONS } from "./config";
import type { Activity } from "./config";
import { comePlan, greetPlan, stretchPlan, type Plan } from "./engine";
import { usePlay } from "./usePlay";
import type { Direction } from "./walk";

type Options = {
  activity: Activity;
  panelOpen: boolean;
  busy: boolean;
  reducedMotion: boolean;
  play: (plan: Plan) => Promise<void>;
  /** Whether he is asleep right now (read at the moment of the move, never stale). */
  sleeping: () => boolean;
};

/** The moves the person or the pointer can ask of Greg, each behind the guards that keep him from surprising anyone. */
export function useLifeMoves({ activity, panelOpen, busy, reducedMotion, play, sleeping }: Options) {
  /** Take a walk now (from the right-click menu), unless something else owns him. */
  const walk = useCallback(() => {
    if (!busy) void play({ behavior: "walk", steps: [{ motion: MOTIONS.listening, ms: LEAD_IN_MS }], walk: { direction: Math.random() < 0.5 ? "left" : "right" } });
  }, [busy, play]);

  const comeAt = useRef(0);
  /** Come over to where the pointer rests (Lively): a stride, stopping short. Not while anything owns him, the panel is open, or he sleeps. */
  const come = useCallback(
    (direction: Direction, distancePx: number) => {
      const now = Date.now();
      if (busy || panelOpen || reducedMotion || activity !== "lively" || sleeping() || now - comeAt.current < COME_COOLDOWN_MS) return;
      comeAt.current = now;
      void play(comePlan(direction, distancePx));
    },
    [activity, busy, panelOpen, play, reducedMotion, sleeping],
  );

  /** The person is back after a long quiet stretch: a stretch and a yawn, when he is free to. */
  const stretch = useCallback(() => {
    if (busy || panelOpen || reducedMotion || activity === "off" || sleeping()) return;
    void play(stretchPlan());
  }, [activity, busy, panelOpen, play, reducedMotion, sleeping]);

  /** He just arrived (launch, show): a wave, then he sits. */
  const greet = useCallback(() => {
    if (reducedMotion || activity === "off") return;
    void play(greetPlan());
  }, [activity, play, reducedMotion]);

  const { playBall, throwBall, isOffering } = usePlay({ activity, busy, reducedMotion, play, sleeping });

  /** The parked panel opened a stride away (or closed again): he trots over, or wanders home. The panel being open is the point here, not a guard. */
  const follow = useCallback(
    (direction: Direction, distancePx: number) => {
      if (busy || reducedMotion || activity === "off" || sleeping()) return false;
      void play(comePlan(direction, distancePx));
      return true;
    },
    [activity, busy, play, reducedMotion, sleeping],
  );

  return { walk, come, stretch, greet, playBall, throwBall, isOffering, follow };
}
