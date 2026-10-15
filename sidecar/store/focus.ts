import { z } from "zod";
import type { Ctx } from "./context";
import { fail, ok, type Result } from "./result";
import { FOCUS_OUTCOMES, FocusOutcomeInput, NewFocusInput, firstIssue, type FocusOutcome, type FocusSession } from "./schema";

const FocusRow = z.object({
  id: z.string(),
  goal: z.string(),
  task_id: z.string().nullable(),
  best_min: z.number(),
  realistic_min: z.number(),
  worst_min: z.number(),
  started_at: z.number(),
  ended_at: z.number().nullable(),
  outcome: z.enum(FOCUS_OUTCOMES).nullable(),
});

function toFocus(row: unknown): FocusSession {
  const r = FocusRow.parse(row);
  return {
    id: r.id,
    goal: r.goal,
    taskId: r.task_id,
    bestMin: r.best_min,
    realisticMin: r.realistic_min,
    worstMin: r.worst_min,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    outcome: r.outcome,
  };
}

export function activeFocus(ctx: Ctx): FocusSession | null {
  const row = ctx.db.prepare("SELECT * FROM focus_sessions WHERE ended_at IS NULL").get();
  return row ? toFocus(row) : null;
}

function getFocus(ctx: Ctx, id: string): Result<FocusSession> {
  const row = ctx.db.prepare("SELECT * FROM focus_sessions WHERE id = ?").get(id);
  return row ? ok(toFocus(row)) : fail("not_found", `No focus session with id ${id}.`);
}

/** The goal is stored exactly as typed (trimmed) so the end check-in can quote it verbatim. */
export function startFocus(ctx: Ctx, input: unknown): Result<FocusSession> {
  const parsed = NewFocusInput.safeParse(input);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  if (activeFocus(ctx)) return fail("conflict", "A focus session is already running. End it before starting another.");
  const { goal, taskId, bestMin, realisticMin, worstMin } = parsed.data;
  const id = ctx.newId();
  ctx.db
    .prepare(
      `INSERT INTO focus_sessions (id, goal, task_id, best_min, realistic_min, worst_min, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, goal, taskId, bestMin, realisticMin, worstMin, ctx.now());
  return getFocus(ctx, id);
}

export function endFocus(ctx: Ctx, id: string, outcome: FocusOutcome): Result<FocusSession> {
  const parsedOutcome = FocusOutcomeInput.safeParse(outcome);
  if (!parsedOutcome.success) return fail("invalid", `Outcome must be one of: ${FOCUS_OUTCOMES.join(", ")}.`);
  const current = getFocus(ctx, id);
  if (!current.ok) return current;
  if (current.value.endedAt !== null) return fail("conflict", "This focus session already ended.");
  ctx.db
    .prepare("UPDATE focus_sessions SET ended_at = ?, outcome = ? WHERE id = ?")
    .run(ctx.now(), parsedOutcome.data, id);
  return getFocus(ctx, id);
}
