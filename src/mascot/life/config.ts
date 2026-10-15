import type { MotionId } from "../sheets";

export const ACTIVITIES = ["off", "calm", "lively"] as const;
export type Activity = (typeof ACTIVITIES)[number];
export type Behavior = "lookAround" | "wave" | "paw" | "layDown" | "sleep" | "walk";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;

/** How long after the person last touched Greg (or the panel) before he may do anything, [min, max] ms. */
export const FIRST_GAP_MS: Readonly<Record<Exclude<Activity, "off">, readonly [number, number]>> = {
  calm: [60 * SECOND, 120 * SECOND],
  lively: [20 * SECOND, 45 * SECOND],
};

/** Quiet time between one behaviour ending and the next may start, [min, max] ms. */
export const GAP_MS: Readonly<Record<Exclude<Activity, "off">, readonly [number, number]>> = {
  calm: [90 * SECOND, 240 * SECOND],
  lively: [30 * SECOND, 90 * SECOND],
};

/** Idle this long and he lies down and goes to sleep. */
export const SLEEP_AFTER_MS: Readonly<Record<Exclude<Activity, "off">, number>> = {
  calm: 10 * MINUTE,
  lively: 5 * MINUTE,
};

/** Relative odds of each behaviour. Sleep is not drawn: it only follows long idleness. */
export const WEIGHTS: Readonly<Record<Exclude<Activity, "off">, Readonly<Record<Exclude<Behavior, "sleep">, number>>>> = {
  calm: { lookAround: 40, wave: 10, paw: 20, layDown: 15, walk: 15 },
  lively: { lookAround: 25, wave: 15, paw: 15, layDown: 10, walk: 35 },
};

/** Soft ceiling the tests hold the engine to: behaviours per hour of continuous idleness. */
export const MAX_PER_HOUR: Readonly<Record<Exclude<Activity, "off">, number>> = { calm: 24, lively: 60 };

/** While blocked (panel open, focus time-box, reduced motion) look again this often. */
export const RECHECK_MS = 5 * SECOND;

/** A lead-in before anything bigger than a glance, so nothing ever starts suddenly. */
export const LEAD_IN_MS = 700;

export const MOTIONS = {
  idle: "smooth:idle",
  listening: "smooth:listening",
  focus: "smooth:focus",
  nudge: "smooth:nudge",
  rest: "smooth:rest",
  wave: "dot:waving",
  runLeft: "dot:running-left",
  runRight: "dot:running-right",
} as const satisfies Record<string, MotionId>;

/** Look poses (clockwise from up): the sheet's frames 0 = up, 2 = up-right, 4 = right in row 9; 4 = left, 6 = up-left in row 10. */
export const GLANCES = ["dot:look-row-9#4", "dot:look-row-10#4", "dot:look-row-9#0", "dot:look-row-9#2", "dot:look-row-10#6"] as const satisfies readonly MotionId[];
export const GLANCE_MS = 1_500;
export const LIE_DOWN_MS = 6 * SECOND;
export const SETTLE_MS = 3 * SECOND;
export const WAVE_MS = 1_400;
export const PAW_MS = 3_180;
