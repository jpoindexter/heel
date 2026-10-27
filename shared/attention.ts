/**
 * Attention sense (N24): the drift rules, pure. A sample every few seconds says which app is in front and how long the
 * person has been idle; the rules turn that into at most one gentle nudge, with a cooldown per rule. The ND skills behind
 * them: nd-hyperfocus-guard, nd-research-gate, nd-taskboundary, nd-inhibit, nd-time-blindness.
 */
const MIN = 60_000;

export type Sample = { at: number; bundle: string; name: string; idleSec: number };

export type Box = { goal: string; startedAt: number; realisticMin: number; worstMin: number };

export type AttentionContext = {
  now: number;
  /** A time-box or a Pomodoro work phase, when one is running. */
  box: Box | null;
  /** The person asked for quiet (Greg Off): no nudges at all. */
  quiet: boolean;
  /** The first open task, in the person's words. */
  nowTask: string | null;
  /** Apps the person said are where they wander: browsers, chat, social. Bundle ids. */
  wanderBundles: readonly string[];
};

export const RULES = ["rabbit-hole", "time-suck", "drifting", "hyperfocus"] as const;
export type Rule = (typeof RULES)[number];

export type Nudge = { rule: Rule; text: string; choices: readonly string[] };

export type AttentionState = {
  /** The app in front and since when. */
  app: { bundle: string; name: string; since: number } | null;
  /** Switch moments in the last window. */
  switches: readonly number[];
  /** How long the last idle stretch lasted, once it ends (for the "back" nudge). */
  lastIdleSec: number;
  wasIdle: boolean;
  /** When each rule last spoke; it stays quiet for SNOOZE_MS after. */
  spokeAt: Readonly<Partial<Record<Rule, number>>>;
};

export const INITIAL_ATTENTION: AttentionState = { app: null, switches: [], lastIdleSec: 0, wasIdle: false, spokeAt: {} };

/** Thresholds. Named so Settings can show them later; chosen from the ND skills' usual numbers. */
export const SNOOZE_MS = 30 * MIN;
export const SWITCH_WINDOW_MS = 5 * MIN;
export const TIME_SUCK_SWITCHES = 12;
export const RABBIT_HOLE_MIN_MS = 15 * MIN;
export const RABBIT_HOLE_SHARE = 0.5;
export const IDLE_IS_AWAY_SEC = 20 * 60;
export const BACK_FROM_IDLE_SEC = 5;
export const HYPERFOCUS_PAST_WORST_MS = 10 * MIN;

const minutesText = (ms: number) => `${Math.round(ms / MIN)} min`;

function fold(state: AttentionState, sample: Sample): AttentionState {
  const switched = state.app !== null && state.app.bundle !== sample.bundle;
  const app = switched || state.app === null ? { bundle: sample.bundle, name: sample.name, since: sample.at } : state.app;
  const switches = [...state.switches.filter((t) => sample.at - t <= SWITCH_WINDOW_MS), ...(switched ? [sample.at] : [])];
  const idle = sample.idleSec >= IDLE_IS_AWAY_SEC;
  const lastIdleSec = state.wasIdle && !idle ? Math.max(state.lastIdleSec, sample.idleSec) : idle ? sample.idleSec : 0;
  return { ...state, app, switches, wasIdle: idle, lastIdleSec: state.wasIdle && !idle ? state.lastIdleSec : lastIdleSec };
}

const canSpeak = (state: AttentionState, rule: Rule, now: number) => (state.spokeAt[rule] ?? Number.NEGATIVE_INFINITY) + SNOOZE_MS <= now;

function pick(state: AttentionState, sample: Sample, ctx: AttentionContext, before: AttentionState): Nudge | null {
  const { app } = state;
  if (ctx.box && app && ctx.wanderBundles.includes(app.bundle)) {
    const away = sample.at - app.since;
    if (away >= Math.max(RABBIT_HOLE_MIN_MS, ctx.box.realisticMin * MIN * RABBIT_HOLE_SHARE)) {
      return { rule: "rabbit-hole", text: `${minutesText(away)} in ${app.name} during “${ctx.box.goal}”. Back to it, or park what you found?`, choices: ["Back to it", "Park it", "Not now"] };
    }
  }
  if (ctx.box && sample.at - ctx.box.startedAt >= ctx.box.worstMin * MIN + HYPERFOCUS_PAST_WORST_MS) {
    return { rule: "hyperfocus", text: `“${ctx.box.goal}” has run past its worst case. Stretch, then keep going?`, choices: ["Keep going", "Stop the box"] };
  }
  if (!ctx.box && state.switches.length >= TIME_SUCK_SWITCHES) {
    return { rule: "time-suck", text: "Lots of switching in the last five minutes. Pick one thing?", choices: ctx.nowTask ? [`Start: ${ctx.nowTask}`, "Not now"] : ["Open Heel", "Not now"] };
  }
  const cameBack = before.wasIdle && !state.wasIdle && sample.idleSec <= BACK_FROM_IDLE_SEC;
  if (!ctx.box && cameBack && ctx.nowTask) {
    return { rule: "drifting", text: `Back after ${Math.round(before.lastIdleSec / 60)} min. Still “${ctx.nowTask}”?`, choices: ["Start a box", "Not now"] };
  }
  return null;
}

/** Fold one sample in and say whether Greg should speak. Quiet, a cooldown or nothing worth saying = null. */
export function decideAttention(state: AttentionState, sample: Sample, ctx: AttentionContext): { state: AttentionState; nudge: Nudge | null } {
  const next = fold(state, sample);
  if (ctx.quiet) return { state: next, nudge: null };
  const nudge = pick(next, sample, ctx, state);
  if (!nudge || !canSpeak(next, nudge.rule, sample.at)) return { state: next, nudge: null };
  return { state: { ...next, spokeAt: { ...next.spokeAt, [nudge.rule]: sample.at } }, nudge };
}
