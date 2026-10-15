/** Time-boxes: how a range is made from one guess, and when a box is up. Pure, shared by the helper and the panel. */

export const FOCUS_OUTCOMES = ["continued", "parked_and_returned", "done", "abandoned"] as const;
export type FocusOutcome = (typeof FOCUS_OUTCOMES)[number];

/** The lengths offered when starting a box (minutes). One tap, no typing. */
export const TIME_BOX_PRESETS_MIN = [15, 25, 45, 60] as const;
export const DEFAULT_TIME_BOX_MIN = 25;

/** People guess short (nd-time-blindness): the range is a best case a little under the guess and a worst case well over it. */
const BEST_CASE_RATIO = 0.7;
const WORST_CASE_RATIO = 1.5;
const MS_PER_MIN = 60_000;

/** A short box after "park it and return": enough to get back in, not a new commitment. */
export const RETURN_BOX_MIN = 10;
const MIN_EXTENSION_MIN = 5;

export type TimeRange = { bestMin: number; realisticMin: number; worstMin: number };

export const rangeFor = (realisticMin: number): TimeRange => ({
  bestMin: Math.max(1, Math.round(realisticMin * BEST_CASE_RATIO)),
  realisticMin,
  worstMin: Math.max(realisticMin, Math.round(realisticMin * WORST_CASE_RATIO)),
});

type Timed = { startedAt: number; realisticMin: number; worstMin: number };

/** When the check-in is due: the realistic end. */
export const dueAt = (session: Timed): number => session.startedAt + session.realisticMin * MS_PER_MIN;

export const isDue = (session: Timed, now: number): boolean => now >= dueAt(session);

/** "Keep going" adds the gap between the realistic and the worst case, never less than a few minutes. */
export const extensionMin = (session: Timed): number => Math.max(MIN_EXTENSION_MIN, session.worstMin - session.realisticMin);
