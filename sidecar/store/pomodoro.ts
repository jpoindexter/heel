import {
  DEFAULT_POMODORO_CONFIG,
  PomodoroConfigSchema,
  PomodoroStateSchema,
  beginPhase,
  endPhase,
  isPhaseDue,
  nextPhase,
  pausePomodoro,
  resumePomodoro,
  startPomodoro,
  type Phase,
  type PomodoroConfig,
  type PomodoroState,
} from "../../shared/pomodoro";
import type { Ctx } from "./context";
import { fail, ok, type Result } from "./result";
import { firstIssue } from "./schema";

const STATE_KEY = "pomodoro";
const CONFIG_KEY = "pomodoro-config";

function readRow<T>(ctx: Ctx, key: string, parse: (raw: unknown) => T | null): T | null {
  const row = ctx.db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (!row) return null;
  try {
    return parse(JSON.parse(String(row.value)));
  } catch {
    return null;
  }
}

function writeRow(ctx: Ctx, key: string, value: unknown): void {
  ctx.db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, JSON.stringify(value), ctx.now());
}

export function getPomodoroConfig(ctx: Ctx): PomodoroConfig {
  return readRow(ctx, CONFIG_KEY, (raw) => PomodoroConfigSchema.safeParse(raw).data ?? null) ?? DEFAULT_POMODORO_CONFIG;
}

export function setPomodoroConfig(ctx: Ctx, input: unknown): Result<PomodoroConfig> {
  const parsed = PomodoroConfigSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  writeRow(ctx, CONFIG_KEY, parsed.data);
  return ok(parsed.data);
}

export type PomodoroRead = { state: PomodoroState | null; config: PomodoroConfig; /** The phase that ended on this read, so the caller can say so once. */ ended: Phase | null };

/** The current state, with a phase that is due moved on (once: later reads see the new state and no `ended`). */
export function readPomodoro(ctx: Ctx): PomodoroRead {
  const config = getPomodoroConfig(ctx);
  const state = readRow(ctx, STATE_KEY, (raw) => (raw === null ? null : (PomodoroStateSchema.safeParse(raw).data ?? null)));
  if (!state) return { state: null, config, ended: null };
  const now = ctx.now();
  if (!isPhaseDue(state, now)) return { state, config, ended: null };
  const next = endPhase(state, config, now);
  writeRow(ctx, STATE_KEY, next);
  return { state: next, config, ended: state.phase };
}

export function startCycle(ctx: Ctx, goal: string, taskId: string | null): Result<PomodoroState> {
  if (readPomodoro(ctx).state) return fail("conflict", "A Pomodoro is already running. Stop it first.");
  const state = startPomodoro(getPomodoroConfig(ctx), ctx.now(), goal, taskId);
  writeRow(ctx, STATE_KEY, state);
  return ok(state);
}

type Move = "pause" | "resume" | "skip" | "next" | "stop";

/** One of the strip's buttons. `skip` ends the phase now; `next` starts what waits; `stop` forgets the cycle. */
export function movePomodoro(ctx: Ctx, move: Move): Result<PomodoroState | null> {
  const { state, config } = readPomodoro(ctx);
  if (!state) return fail("not_found", "No Pomodoro is running.");
  const now = ctx.now();
  if (move === "stop") {
    writeRow(ctx, STATE_KEY, null);
    return ok(null);
  }
  const next =
    move === "pause" ? pausePomodoro(state, now)
    : move === "resume" ? resumePomodoro(state, now)
    : move === "skip" ? endPhase(state, config, now)
    : state.waiting ? beginPhase(state, nextPhase(state, config), config, now)
    : state;
  writeRow(ctx, STATE_KEY, next);
  return ok(next);
}
