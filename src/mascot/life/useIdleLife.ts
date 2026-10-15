import { useCallback, useEffect, useRef, useState } from "react";
import type { MotionId } from "../sheets";
import { useReducedMotion } from "../useReducedMotion";
import type { Activity } from "./config";
import { decide, initialState, interact, type LifeState, type Plan } from "./engine";

const TICK_MS = 1_000;

type Options = {
  activity: Activity;
  panelOpen: boolean;
  /** Something else owns Greg right now (thinking, a one-shot, a focus time-box). */
  busy: boolean;
  /** Show this when Greg is doing something of his own; the idle pose when `null`. */
  setLifeMotion: (motion: MotionId | null) => void;
};

/**
 * Runs the idle-life engine: once a second it asks what Greg should do, plays the steps, and goes back to sitting.
 * `touch` is any contact from the person (wakes him, resets the quiet stretch); `nap` sends him to sleep now.
 */
export function useIdleLife({ activity, panelOpen, busy, setLifeMotion }: Options) {
  const reducedMotion = useReducedMotion();
  const state = useRef<LifeState>(initialState(Date.now(), activity, Math.random));
  const running = useRef(0);
  const [asleep, setAsleep] = useState(false);

  const play = useCallback(
    async (plan: Plan) => {
      const mine = ++running.current;
      for (const step of plan.steps) {
        if (running.current !== mine) return;
        setLifeMotion(step.motion);
        if (!Number.isFinite(step.ms)) return;
        await new Promise((resolve) => window.setTimeout(resolve, step.ms));
      }
      if (running.current === mine) setLifeMotion(null);
    },
    [setLifeMotion],
  );

  const touch = useCallback(() => {
    running.current += 1;
    state.current = interact(state.current, Date.now(), activity, Math.random);
    setAsleep(false);
    setLifeMotion(null);
  }, [activity, setLifeMotion]);

  const nap = useCallback(() => {
    state.current = { ...state.current, lastActiveAt: Number.NEGATIVE_INFINITY, nextAt: 0 };
  }, []);

  useEffect(() => {
    if (activity === "off") touch();
  }, [activity, touch]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const ctx = { now: Date.now(), activity, panelOpen, focusActive: busy, reducedMotion, canWalk: false };
      const result = decide(state.current, ctx, Math.random);
      state.current = result.state;
      setAsleep(result.state.sleeping);
      if (result.plan) void play(result.plan);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [activity, panelOpen, busy, reducedMotion, play]);

  return { touch, nap, asleep };
}

