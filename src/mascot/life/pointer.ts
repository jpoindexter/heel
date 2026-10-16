import { z } from "zod";
import type { MotionId } from "../sheets";
import { COME_BOTTOM_PX, COME_MAX_PX, COME_MIN_PX, COME_STOP_SHORT_PX, GAZE_EYE, GAZE_RANGE_PX, GLANCE_HOLD_MS, GLANCE_REST_MS, LONG_IDLE_MS, LOOK_STEPS, MORNING_HOURS, REST_JITTER_PX, REST_MS, WALK_DISTANCE_PX, type Activity } from "./config";
import type { Direction } from "./walk";

/** The shell's pointer sample: logical px from Greg's window's top-left; `bottom` is the usable screen's bottom edge in the same frame. */
export const PointerSampleSchema = z.object({ x: z.number().finite(), y: z.number().finite(), bottom: z.number().finite() });
export type PointerSample = z.output<typeof PointerSampleSchema>;

export const pointerFromPayload = (payload: unknown): PointerSample | null => {
  const parsed = PointerSampleSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
};

/** Which of the sixteen looks faces (dx, dy): clockwise from straight up in 22.5° steps, screen y down. */
export function lookIndex(dx: number, dy: number): number {
  const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const step = Math.round(degrees / (360 / LOOK_STEPS));
  return ((step % LOOK_STEPS) + LOOK_STEPS) % LOOK_STEPS;
}

/** The look toward the pointer while it is near enough to matter; null when it is far away. */
export function gazeMotion(sample: PointerSample): MotionId | null {
  const dx = sample.x - GAZE_EYE.x;
  const dy = sample.y - GAZE_EYE.y;
  if (Math.hypot(dx, dy) > GAZE_RANGE_PX) return null;
  return `puppy:look-directions#${lookIndex(dx, dy)}`;
}

export type GlanceState = { since: number | null; restUntil: number };
export const GLANCE_START: GlanceState = { since: null, restUntil: 0 };

/**
 * Calm is a glance, not a stare: hold the look for a while, then rest the eyes before the next one. Lively follows
 * the pointer for as long as it stays near. Pure: the caller passes the clock.
 */
export function glance(state: GlanceState, now: number, target: MotionId | null, activity: Activity): { state: GlanceState; show: MotionId | null } {
  if (target === null || activity === "off") return { state: { ...state, since: null }, show: null };
  if (activity === "lively") return { state: { ...state, since: state.since ?? now }, show: target };
  if (now < state.restUntil) return { state, show: null };
  if (state.since === null) return { state: { ...state, since: now }, show: target };
  if (now - state.since >= GLANCE_HOLD_MS) return { state: { since: null, restUntil: now + GLANCE_REST_MS }, show: null };
  return { state, show: target };
}

export type RestState = { x: number; y: number; since: number; served: boolean };

/** Has the pointer been resting (within a little jitter) for a few seconds? `served` stops one rest asking twice. */
export function rest(state: RestState | null, sample: PointerSample, now: number): { state: RestState; rested: boolean } {
  if (!state || Math.hypot(sample.x - state.x, sample.y - state.y) > REST_JITTER_PX) {
    return { state: { x: sample.x, y: sample.y, since: now, served: false }, rested: false };
  }
  return { state, rested: !state.served && now - state.since >= REST_MS };
}

/** Where to walk when the pointer rests low on the screen, a stride away: the direction and how far, stopping short of it. */
export function comeTarget(sample: PointerSample): { direction: Direction; distancePx: number } | null {
  if (sample.bottom - sample.y > COME_BOTTOM_PX || sample.y > sample.bottom) return null;
  const dx = sample.x - GAZE_EYE.x;
  if (Math.abs(dx) < COME_MIN_PX || Math.abs(dx) > COME_MAX_PX) return null;
  const distancePx = Math.min(Math.abs(dx) - COME_STOP_SHORT_PX, WALK_DISTANCE_PX[1]);
  return { direction: dx > 0 ? "right" : "left", distancePx };
}

/** The first move after a long quiet stretch: worth a stretch and a yawn. */
export const returnedAfterIdle = (lastMoveAt: number, now: number): boolean => now - lastMoveAt >= LONG_IDLE_MS;

/** The first move of the morning (once a day): a stretch at first sight. `lastMorning` is the day it last happened. */
export function morningFirstSight(hour: number, today: string, lastMorning: string | null): boolean {
  return hour >= MORNING_HOURS[0] && hour < MORNING_HOURS[1] && lastMorning !== today;
}
