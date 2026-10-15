import type { MotionId } from "../sheets";
import { CARRY_MS, CHEW_MS, CLIP_MS, FIRST_GAP_MS, GAG_WEIGHT, GAP_MS, GLANCES, GLANCE_MS, LEAD_IN_MS, LIE_DOWN_MS, MOTIONS, PAW_MS, RECHECK_MS, SETTLE_MS, SLEEP_AFTER_MS, SNIFF_MS, TRAIL_MS, WAVE_MS, WEIGHTS, type Activity, type Behavior } from "./config";

/** One thing Greg does for a while. `ms: Infinity` holds until the person interrupts (sleeping). */
export type Step = { motion: MotionId; ms: number };
export type Plan = { behavior: Behavior; steps: Step[]; walk?: { direction: "left" | "right" } };

export type LifeState = {
  /** When the person last touched Greg or the panel. */
  lastActiveAt: number;
  /** Not before this time. */
  nextAt: number;
  sleeping: boolean;
  lastBehavior: Behavior | null;
};

export type Context = {
  now: number;
  activity: Activity;
  panelOpen: boolean;
  focusActive: boolean;
  reducedMotion: boolean;
  canWalk: boolean;
  /** The person opted in to the bathroom gags. Off by default. */
  gags?: boolean;
};

export type Rng = () => number;

const between = (rng: Rng, [min, max]: readonly [number, number]) => min + rng() * (max - min);
const pick = <T>(items: readonly T[], rng: Rng): T => items[Math.min(items.length - 1, Math.floor(rng() * items.length))]!;

function pickWeighted(weights: Readonly<Record<string, number>>, rng: Rng): string {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  let roll = rng() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [name, weight] of entries) {
    roll -= weight;
    if (roll < 0) return name;
  }
  return entries.at(-1)![0];
}

/** Any touch from the person: wake up, forget the schedule, and give them a quiet stretch before anything happens. */
export function interact(state: LifeState, now: number, activity: Activity, rng: Rng): LifeState {
  const gap = activity === "off" ? RECHECK_MS : between(rng, FIRST_GAP_MS[activity]);
  return { ...state, lastActiveAt: now, sleeping: false, nextAt: now + gap };
}

export function initialState(now: number, activity: Activity, rng: Rng): LifeState {
  return interact({ lastActiveAt: now, nextAt: 0, sleeping: false, lastBehavior: null }, now, activity, rng);
}

export const planDuration = (plan: Plan): number => plan.steps.reduce((sum, step) => sum + (Number.isFinite(step.ms) ? step.ms : 0), 0);

function glances(rng: Rng): Step[] {
  const first = pick(GLANCES, rng);
  const second = pick(GLANCES.filter((glance) => glance !== first), rng);
  return [first, second].map((motion) => ({ motion, ms: GLANCE_MS }));
}

const step = (motion: Step["motion"], ms: number): Step => ({ motion, ms });
/** Lying down and getting up again are played, never cut: lie-down → (lying) → wake-up → sit-down. */
const lieThenRise = (lying: Step[]): Step[] => [step(MOTIONS.lieDown, CLIP_MS.lieDown), ...lying, step(MOTIONS.wakeUp, CLIP_MS.wakeUp), step(MOTIONS.sitDown, CLIP_MS.sitDown)];

/** His games, habits and small nature moments: one picked at random, each a short authored sequence. */
function extras(behavior: "play" | "groom" | "sniff" | "nature" | "gag", rng: Rng): Step[] {
  switch (behavior) {
    case "play":
      return pick([[step(MOTIONS.ball, CLIP_MS.ball), step(MOTIONS.offerBall, CLIP_MS.offerBall)], [step(MOTIONS.bow, CLIP_MS.bow)]], rng);
    case "groom":
      return pick([[step(MOTIONS.scratch, CLIP_MS.scratch)], [step(MOTIONS.yawn, CLIP_MS.yawn)], [step(MOTIONS.stretch, CLIP_MS.stretch)]], rng);
    case "sniff":
      return [step(MOTIONS.sniff, SNIFF_MS)];
    case "nature":
      return pick(
        [[step(MOTIONS.grass, CLIP_MS.grass)], [step(MOTIONS.trail, TRAIL_MS), step(MOTIONS.grass, CLIP_MS.grass)], [step(MOTIONS.pickStick, CLIP_MS.pickStick), step(MOTIONS.carryStick, CARRY_MS), step(MOTIONS.chewStick, CHEW_MS)]],
        rng,
      );
    case "gag":
      return [step(pick([MOTIONS.poop, MOTIONS.pee], rng), CLIP_MS.poop)];
  }
}

function planFor(behavior: Behavior, rng: Rng): Plan {
  switch (behavior) {
    case "lookAround":
      return { behavior, steps: glances(rng) };
    case "wave":
      return { behavior, steps: [step(MOTIONS.wave, WAVE_MS)] };
    case "paw":
      return { behavior, steps: [step(MOTIONS.nudge, PAW_MS)] };
    case "layDown":
      return { behavior, steps: lieThenRise([step(MOTIONS.focus, LIE_DOWN_MS)]) };
    case "sleep":
      return { behavior, steps: [step(MOTIONS.lieDown, CLIP_MS.lieDown), step(MOTIONS.focus, SETTLE_MS), step(MOTIONS.curlUp, CLIP_MS.curlUp), step(MOTIONS.rest, Infinity)] };
    case "walk": {
      const direction = rng() < 0.5 ? "left" : "right";
      return { behavior, steps: [step(MOTIONS.listening, LEAD_IN_MS)], walk: { direction } };
    }
    default:
      return { behavior, steps: extras(behavior, rng) };
  }
}

/**
 * What, if anything, Greg should do now. Pure: the caller passes the clock and the dice. Quiet by default: nothing
 * while the panel is open, during a focus time-box, with reduced motion, or when activity is Off.
 */
export function decide(state: LifeState, ctx: Context, rng: Rng): { state: LifeState; plan: Plan | null } {
  const { activity } = ctx;
  if (activity === "off" || ctx.panelOpen || ctx.focusActive || ctx.reducedMotion) {
    return { state: { ...state, nextAt: Math.max(state.nextAt, ctx.now + RECHECK_MS) }, plan: null };
  }
  if (state.sleeping || ctx.now < state.nextAt) return { state, plan: null };

  if (ctx.now - state.lastActiveAt >= SLEEP_AFTER_MS[activity]) {
    const plan = planFor("sleep", rng);
    return { state: { ...state, sleeping: true, nextAt: Infinity, lastBehavior: "sleep" }, plan };
  }

  const weights: Record<string, number> = { ...WEIGHTS[activity], gag: ctx.gags ? GAG_WEIGHT : 0 };
  if (!ctx.canWalk) delete weights.walk;
  if (state.lastBehavior) delete weights[state.lastBehavior];
  const plan = planFor(pickWeighted(weights, rng) as Behavior, rng);
  const nextAt = ctx.now + planDuration(plan) + between(rng, GAP_MS[activity]);
  return { state: { ...state, nextAt, lastBehavior: plan.behavior }, plan };
}
