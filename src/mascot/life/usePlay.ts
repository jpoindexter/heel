import { useCallback, useRef } from "react";
import type { Activity } from "./config";
import { playPlan, throwPlan, type Plan } from "./engine";

type Options = { activity: Activity; busy: boolean; reducedMotion: boolean; play: (plan: Plan) => Promise<void>; sleeping: () => boolean };

/** "Play" on the menu (N25): the ball, then the offer held a while. While he offers it, a click on him is the throw: off he runs, and back. */
export function usePlay({ activity, busy, reducedMotion, play, sleeping }: Options) {
  const offering = useRef<number | undefined>(undefined);
  const playBall = useCallback(() => {
    if (busy || reducedMotion || activity === "off" || sleeping()) return;
    void play(playPlan());
    window.clearTimeout(offering.current);
    offering.current = window.setTimeout(() => (offering.current = undefined), playPlan().steps.reduce((sum, s) => sum + s.ms, 0));
  }, [activity, busy, play, reducedMotion, sleeping]);
  const isOffering = useCallback(() => offering.current !== undefined, []);
  const throwBall = useCallback(() => {
    if (!isOffering()) return false;
    window.clearTimeout(offering.current);
    offering.current = undefined;
    void play(throwPlan(Math.random() < 0.5 ? "left" : "right"));
    return true;
  }, [isOffering, play]);

  return { playBall, throwBall, isOffering };
}
