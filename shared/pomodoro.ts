import { z } from "zod";

/**
 * Pomodoro (N18): work, short break, after `cycles` works a long break. Pure and wall-clock based, so a sleeping Mac
 * or a restart changes nothing: the helper keeps one state row and recomputes from `now`.
 */
const MS_PER_MIN = 60_000;

export const PomodoroConfigSchema = z.object({
  workMin: z.number().int().min(1).max(120).default(25),
  shortMin: z.number().int().min(1).max(60).default(5),
  longMin: z.number().int().min(1).max(90).default(15),
  cycles: z.number().int().min(1).max(12).default(4),
  /** Start the next phase by itself. Off by default: a break that starts on its own is a nudge nobody asked for. */
  autoStart: z.boolean().default(false),
});
export type PomodoroConfig = z.output<typeof PomodoroConfigSchema>;
export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = PomodoroConfigSchema.parse({});

export const PHASES = ["work", "short", "long"] as const;
export type Phase = (typeof PHASES)[number];

export const PomodoroStateSchema = z.object({
  goal: z.string(),
  taskId: z.string().nullable(),
  /** Which work phase this is (1-based); unchanged through its break. */
  cycle: z.number().int().min(1),
  phase: z.enum(PHASES),
  phaseStartedAt: z.number(),
  phaseMin: z.number().int().min(1),
  paused: z.object({ remainingMs: z.number().min(0) }).nullable(),
  /** The phase has ended and the next waits for the person (no auto-start). */
  waiting: z.boolean(),
});
export type PomodoroState = z.output<typeof PomodoroStateSchema>;

const minutesOf = (phase: Phase, cfg: PomodoroConfig): number => (phase === "work" ? cfg.workMin : phase === "short" ? cfg.shortMin : cfg.longMin);

export function startPomodoro(cfg: PomodoroConfig, now: number, goal: string, taskId: string | null): PomodoroState {
  return { goal, taskId, cycle: 1, phase: "work", phaseStartedAt: now, phaseMin: cfg.workMin, paused: null, waiting: false };
}

export function remainingMs(state: PomodoroState, now: number): number {
  if (state.waiting) return 0;
  if (state.paused) return state.paused.remainingMs;
  return Math.max(0, state.phaseStartedAt + state.phaseMin * MS_PER_MIN - now);
}

export const isPhaseDue = (state: PomodoroState, now: number): boolean => !state.waiting && !state.paused && remainingMs(state, now) === 0;

/** After work comes a break (long after every `cycles`th work); after a break, work. */
export function nextPhase(state: PomodoroState, cfg: PomodoroConfig): Phase {
  if (state.phase !== "work") return "work";
  return state.cycle % cfg.cycles === 0 ? "long" : "short";
}

/** Enter a phase now. Work after a break is the next cycle. */
export function beginPhase(state: PomodoroState, phase: Phase, cfg: PomodoroConfig, now: number): PomodoroState {
  const cycle = phase === "work" && state.phase !== "work" ? state.cycle + 1 : state.cycle;
  return { ...state, cycle, phase, phaseStartedAt: now, phaseMin: minutesOf(phase, cfg), paused: null, waiting: false };
}

/** The phase is over: straight into the next with auto-start, otherwise wait for the person. */
export function endPhase(state: PomodoroState, cfg: PomodoroConfig, now: number): PomodoroState {
  if (cfg.autoStart) return beginPhase(state, nextPhase(state, cfg), cfg, now);
  return { ...state, paused: null, waiting: true };
}

export function pausePomodoro(state: PomodoroState, now: number): PomodoroState {
  if (state.paused || state.waiting) return state;
  return { ...state, paused: { remainingMs: remainingMs(state, now) } };
}

export function resumePomodoro(state: PomodoroState, now: number): PomodoroState {
  if (!state.paused) return state;
  return { ...state, phaseStartedAt: now - (state.phaseMin * MS_PER_MIN - state.paused.remainingMs), paused: null };
}

/** What the strip says: "Work 2 of 4 · 17 min left", "Break · 4 min left", "Work done" while waiting. */
export function describePomodoro(state: PomodoroState, cfg: PomodoroConfig, now: number): { title: string; detail: string } {
  const minutes = Math.ceil(remainingMs(state, now) / MS_PER_MIN);
  const title = state.phase === "work" ? `Work ${state.cycle} of ${cfg.cycles}` : state.phase === "long" ? "Long break" : "Break";
  if (state.waiting) return { title, detail: state.phase === "work" ? "done" : "over" };
  if (state.paused) return { title, detail: `paused, ${minutes} min left` };
  return { title, detail: `${minutes} min left` };
}

/** The phase's start as a time-box would see it (pauses pushed forward), for the guards that read /focus. */
export const effectiveStartedAt = (state: PomodoroState, now: number): number =>
  state.paused ? now - (state.phaseMin * MS_PER_MIN - state.paused.remainingMs) : state.phaseStartedAt;
