import { useCallback, useEffect, useRef, useState } from "react";
import type { MotionId } from "../sheets";
import { useReducedMotion } from "../useReducedMotion";
import { LEAD_IN_MS, MOTIONS } from "./config";
import type { Activity } from "./config";
import { decide, initialState, interact, type LifeState } from "./engine";
import { usePlanPlayer } from "./usePlanPlayer";

const TICK_MS = 1_000;
/** Bathroom gags are opt-in: `localStorage["heel:gags"] = "on"` (a Settings switch comes with N4). */
export const GAGS_STORAGE_KEY = "heel:gags";
const gagsOn = (): boolean => {
  try {
    return window.localStorage.getItem(GAGS_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
};

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
  const [asleep, setAsleep] = useState(false);

  const { play, cancel } = usePlanPlayer(setLifeMotion);

  const touch = useCallback(() => {
    cancel();
    state.current = interact(state.current, Date.now(), activity, Math.random);
    setAsleep(false);
    setLifeMotion(null);
  }, [activity, cancel, setLifeMotion]);

  /** Take a walk now (from the right-click menu), unless something else owns him. */
  const walk = useCallback(() => {
    if (!busy) void play({ behavior: "walk", steps: [{ motion: MOTIONS.listening, ms: LEAD_IN_MS }], walk: { direction: Math.random() < 0.5 ? "left" : "right" } });
  }, [busy, play]);

  const nap = useCallback(() => {
    state.current = { ...state.current, lastActiveAt: Number.NEGATIVE_INFINITY, nextAt: 0 };
  }, []);

  useEffect(() => {
    if (activity === "off") touch();
  }, [activity, touch]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const ctx = { now: Date.now(), activity, panelOpen, focusActive: busy, reducedMotion, canWalk: true, gags: gagsOn() };
      const result = decide(state.current, ctx, Math.random);
      state.current = result.state;
      setAsleep(result.state.sleeping);
      if (result.plan) void play(result.plan);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [activity, panelOpen, busy, reducedMotion, play]);

  return { touch, nap, walk, asleep };
}

