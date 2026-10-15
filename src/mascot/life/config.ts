import { clipMs } from "../puppy";
import type { MotionId } from "../sheets";

export const ACTIVITIES = ["off", "calm", "lively"] as const;
export type Activity = (typeof ACTIVITIES)[number];
/** What he does on his own. `gag` only when the person has opted in (bathroom humour is nobody's default). `wake` is the rise after sleep. */
export type Behavior = "lookAround" | "wave" | "paw" | "layDown" | "sleep" | "wake" | "walk" | "play" | "groom" | "sniff" | "nature" | "gag";

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

/** Relative odds of each behaviour. Sleep is not drawn: it only follows long idleness. Gags are off unless opted in. */
export const WEIGHTS: Readonly<Record<Exclude<Activity, "off">, Readonly<Record<Exclude<Behavior, "sleep" | "wake">, number>>>> = {
  calm: { lookAround: 30, wave: 8, paw: 12, layDown: 12, walk: 12, play: 6, groom: 10, sniff: 8, nature: 6, gag: 0 },
  lively: { lookAround: 20, wave: 10, paw: 10, layDown: 8, walk: 25, play: 10, groom: 7, sniff: 10, nature: 8, gag: 0 },
};
/** With the opt-in on, a gag is rare: about one in forty behaviours. */
export const GAG_WEIGHT = 3;

/** Soft ceiling the tests hold the engine to: behaviours per hour of continuous idleness. */
export const MAX_PER_HOUR: Readonly<Record<Exclude<Activity, "off">, number>> = { calm: 24, lively: 60 };

/** While blocked (panel open, focus time-box, reduced motion) look again this often. */
export const RECHECK_MS = 5 * SECOND;

/** A lead-in before anything bigger than a glance, so nothing ever starts suddenly. */
export const LEAD_IN_MS = 700;

export const MOTIONS = {
  idle: "puppy:idle",
  listening: "puppy:listening",
  focus: "puppy:focus",
  nudge: "puppy:nudge",
  rest: "puppy:rest",
  wave: "puppy:wave",
  runLeft: "puppy:walk-left",
  runRight: "puppy:walk-right",
  // Transitions (one-shots) so a posture never hard-cuts.
  lieDown: "puppy:lie-down",
  curlUp: "puppy:curl-up",
  wakeUp: "puppy:wake-up",
  sitDown: "puppy:sit-down",
  turnAround: "puppy:turn-around",
  // His own games and habits.
  ball: "puppy:ball-play",
  offerBall: "puppy:fetch-offer",
  bow: "puppy:play-bow",
  scratch: "puppy:scratch-ear",
  yawn: "puppy:yawn",
  stretch: "puppy:stretch",
  sniff: "puppy:sniff-search",
  trail: "puppy:sniff-trail",
  grass: "puppy:graze-grass",
  pickStick: "puppy:pick-up-stick",
  carryStick: "puppy:carry-stick",
  chewStick: "puppy:chew-stick",
  poop: "puppy:poop-gag",
  pee: "puppy:pee-gag",
} as const satisfies Record<string, MotionId>;

/** Gaze targets, clockwise from straight up in 22.5° steps: right, left, up, up-right, up-left. */
export const GLANCES = ["puppy:look-directions#4", "puppy:look-directions#12", "puppy:look-directions#0", "puppy:look-directions#2", "puppy:look-directions#14"] as const satisfies readonly MotionId[];
export const GLANCE_MS = 1_500;
export const LIE_DOWN_MS = 6 * SECOND;
export const SETTLE_MS = 3 * SECOND;
export const WAVE_MS = clipMs("wave");
export const PAW_MS = clipMs("nudge");
/** One pass of each one-shot, from the pack's own timings. */
export const CLIP_MS = {
  lieDown: clipMs("lie-down"),
  curlUp: clipMs("curl-up"),
  wakeUp: clipMs("wake-up"),
  sitDown: clipMs("sit-down"),
  turnAround: clipMs("turn-around"),
  ball: clipMs("ball-play"),
  offerBall: clipMs("fetch-offer"),
  bow: clipMs("play-bow"),
  scratch: clipMs("scratch-ear"),
  yawn: clipMs("yawn"),
  stretch: clipMs("stretch"),
  grass: clipMs("graze-grass"),
  pickStick: clipMs("pick-up-stick"),
  poop: clipMs("poop-gag"),
  pee: clipMs("pee-gag"),
} as const;
/** Loops he holds for a while: sniffing about, following a scent, carrying his stick, chewing it. */
export const SNIFF_MS = 4 * SECOND;
export const TRAIL_MS = 3 * SECOND;
export const CARRY_MS = 3 * SECOND;
export const CHEW_MS = 4 * SECOND;

/** How far one walk tries to go (logical px), [min, max]. A wall shortens it; no room at all means he stays put. */
export const WALK_DISTANCE_PX: readonly [number, number] = [240, 560];
/** Give a walk this long beyond its planned time before assuming the shell forgot to say it ended. */
export const WALK_GRACE_MS = 1_000;
