import { z } from "zod";

/**
 * Ways of working (N17): one timer, one structure, one sizing; they combine. The enums name every method the product
 * knows so the stored setting stays stable; `BUILT` says which can be chosen today (the rest arrive with N18–N21).
 */
export const TIMERS = ["timebox", "pomodoro"] as const;
export const STRUCTURES = ["none", "pickle-jar", "one-three-five", "eisenhower", "frog"] as const;
export const SIZINGS = ["none", "tshirt"] as const;
export const SIZES = ["xs", "s", "m", "l", "xl"] as const;

export type Timer = (typeof TIMERS)[number];
export type Structure = (typeof STRUCTURES)[number];
export type Sizing = (typeof SIZINGS)[number];
export type Size = (typeof SIZES)[number];

/** The buckets each structure sorts tasks into, in the order they are shown. */
export const BUCKETS: Readonly<Record<Exclude<Structure, "none">, readonly string[]>> = {
  "pickle-jar": ["rock", "pebble", "sand"],
  "one-three-five": ["big", "medium", "small"],
  eisenhower: ["do", "schedule", "delegate", "drop"],
  frog: ["frog", "rest"],
};
export const ALL_BUCKETS: readonly string[] = [...new Set(Object.values(BUCKETS).flat())];

export const MethodSchema = z.object({ timer: z.enum(TIMERS), structure: z.enum(STRUCTURES), sizing: z.enum(SIZINGS) });
export type Method = z.output<typeof MethodSchema>;
export const DEFAULT_METHOD: Method = { timer: "timebox", structure: "none", sizing: "none" };

export const BUILT = {
  timer: ["timebox", "pomodoro"] as readonly Timer[],
  structure: ["none", "pickle-jar"] as readonly Structure[],
  sizing: ["none", "tshirt"] as readonly Sizing[],
} as const;

/** Why a choice cannot be made yet, in one sentence; null when it can. */
export function notBuiltReason(method: Method): string | null {
  if (!BUILT.timer.includes(method.timer)) return `${method.timer} is not a timer Heel has.`;
  if (!BUILT.structure.includes(method.structure)) return `${method.structure} arrives later (N21). Pickle jar is the structure you can pick today.`;
  if (!BUILT.sizing.includes(method.sizing)) return "Only T-shirt sizing exists for now.";
  return null;
}

export const SIZE_LABELS: Readonly<Record<Size, string>> = { xs: "XS", s: "S", m: "M", l: "L", xl: "XL" };

export const BUCKET_LABELS: Readonly<Record<string, string>> = {
  rock: "Rock",
  pebble: "Pebble",
  sand: "Sand",
  big: "Big",
  medium: "Medium",
  small: "Small",
  do: "Do",
  schedule: "Schedule",
  delegate: "Delegate",
  drop: "Drop",
  frog: "Frog",
  rest: "Rest",
};
