import { z } from "zod";
import { inTransaction, type Ctx } from "./context";
import { fail, ok, type Result } from "./result";
import { NewParkedInput, firstIssue, type ParkedIdea, type Task } from "./schema";
import { addTask } from "./tasks";

const ParkedRow = z.object({
  id: z.string(),
  idea: z.string(),
  why: z.string().nullable(),
  created_at: z.number(),
  promoted_task_id: z.string().nullable(),
});

function toParked(row: unknown): ParkedIdea {
  const r = ParkedRow.parse(row);
  return { id: r.id, idea: r.idea, why: r.why, createdAt: r.created_at, promotedTaskId: r.promoted_task_id };
}

function getParked(ctx: Ctx, id: string): Result<ParkedIdea> {
  const row = ctx.db.prepare("SELECT * FROM parked WHERE id = ?").get(id);
  return row ? ok(toParked(row)) : fail("not_found", `No parked idea with id ${id}.`);
}

export function parkIdea(ctx: Ctx, input: unknown): Result<ParkedIdea> {
  const parsed = NewParkedInput.safeParse(input);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  const id = ctx.newId();
  ctx.db
    .prepare("INSERT INTO parked (id, idea, why, created_at) VALUES (?, ?, ?, ?)")
    .run(id, parsed.data.idea, parsed.data.why, ctx.now());
  return getParked(ctx, id);
}

/** Newest first; promoted ideas are hidden unless asked for. */
export function listParked(ctx: Ctx, includePromoted = false): ParkedIdea[] {
  const where = includePromoted ? "" : "WHERE promoted_task_id IS NULL";
  return ctx.db
    .prepare(`SELECT * FROM parked ${where} ORDER BY created_at DESC, rowid DESC`)
    .all()
    .map(toParked);
}

/** Turn a parked idea into a task. The idea stays on record, linked to the new task. */
export function promoteParked(ctx: Ctx, id: string): Result<Task> {
  const parked = getParked(ctx, id);
  if (!parked.ok) return parked;
  if (parked.value.promotedTaskId) return fail("conflict", "This idea is already a task.");
  return inTransaction(ctx, () => {
    const task = addTask(ctx, { title: parked.value.idea.slice(0, 500) });
    if (!task.ok) return task;
    ctx.db.prepare("UPDATE parked SET promoted_task_id = ? WHERE id = ?").run(task.value.id, id);
    return task;
  });
}
