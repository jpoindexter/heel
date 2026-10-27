import { z } from "zod";

/**
 * Ways of working (N17): one timer, one structure, one sizing; they combine. The enums name every method the product
 * knows so the stored setting stays stable; `BUILT` says which can be chosen today (the rest arrive with N18–N21).
 */
export const TIMERS = ["timebox", "pomodoro"] as const;
export const STRUCTURES = ["none", "pickle-jar", "one-three-five", "eisenhower", "frog", "two-minute"] as const;
export const SIZINGS = ["none", "tshirt"] as const;
export const SIZES = ["xs", "s", "m", "l", "xl"] as const;

export type Timer = (typeof TIMERS)[number];
export type Structure = (typeof STRUCTURES)[number];
export type Sizing = (typeof SIZINGS)[number];
export type Size = (typeof SIZES)[number];

/** 1-3-5's three slots, each with a count in the numbers. */
export const SLOT_BUCKETS = ["big", "medium", "small"] as const;
export type SlotBucket = (typeof SLOT_BUCKETS)[number];

/** The buckets each structure sorts tasks into, in the order they are shown. */
export const BUCKETS: Readonly<Record<Exclude<Structure, "none">, readonly string[]>> = {
  "pickle-jar": ["rock", "pebble", "sand"],
  "one-three-five": SLOT_BUCKETS,
  eisenhower: ["do", "schedule", "delegate", "drop"],
  frog: ["frog", "rest"],
  "two-minute": ["quick"],
};
export const ALL_BUCKETS: readonly string[] = [...new Set(Object.values(BUCKETS).flat())];

export const MethodSchema = z.object({ timer: z.enum(TIMERS), structure: z.enum(STRUCTURES), sizing: z.enum(SIZINGS) });
export type Method = z.output<typeof MethodSchema>;
export const DEFAULT_METHOD: Method = { timer: "timebox", structure: "none", sizing: "none" };

export const BUILT = {
  timer: ["timebox", "pomodoro"] as readonly Timer[],
  structure: ["none", "pickle-jar", "one-three-five", "eisenhower", "frog", "two-minute"] as readonly Structure[],
  sizing: ["none", "tshirt"] as readonly Sizing[],
} as const;

/** Why a choice cannot be made yet, in one sentence; null when it can. */
export function notBuiltReason(method: Method): string | null {
  if (!BUILT.timer.includes(method.timer)) return `${method.timer} is not a timer Heel has.`;
  if (!BUILT.structure.includes(method.structure)) return `${method.structure} arrives later (N21).`;
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
  quick: "Do it now",
};

const slot = (holds: number) => z.number().int().min(0).max(12).default(holds);

/** The numbers behind the methods (N19 jar, N20 sizes, N21 slots), kept by the helper. Minutes everywhere; hours only in the UI. */
export const MethodNumbersSchema = z.object({
  /** Real work the day holds (minutes). */
  jarCapacityMin: z.number().int().min(30).max(720).default(240),
  maxRocks: z.number().int().min(1).max(5).default(2),
  sizeMinutes: z
    .object({ xs: z.number().int().min(1).max(600).default(10), s: z.number().int().min(1).max(600).default(25), m: z.number().int().min(1).max(600).default(50), l: z.number().int().min(1).max(600).default(120), xl: z.number().int().min(1).max(600).default(240) })
    .default({ xs: 10, s: 25, m: 50, l: 120, xl: 240 }),
  /** 1-3-5: how many big, medium and small tasks the day holds. */
  slots: z.object({ big: slot(1), medium: slot(3), small: slot(5) }).default({ big: 1, medium: 3, small: 5 }),
  /** Two-minute rule: the box a "Do it now" task gets (minutes). */
  quickMin: z.number().int().min(1).max(15).default(2),
});
export type MethodNumbers = z.output<typeof MethodNumbersSchema>;
export const DEFAULT_METHOD_NUMBERS: MethodNumbers = MethodNumbersSchema.parse({});
