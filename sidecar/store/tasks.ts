import { z } from "zod";
import type { Ctx } from "./context";
import { fail, ok, type Result } from "./result";
import { NewTaskInput, TASK_SOURCES, TASK_STATUSES, TaskPatchInput, firstIssue, type Task, type TaskStatus } from "./schema";
import { SIZES } from "../../shared/method";

const TaskRow = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(TASK_STATUSES),
  now_step: z.string().nullable(),
  source: z.enum(TASK_SOURCES),
  source_ref: z.string().nullable(),
  position: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
  completed_at: z.number().nullable(),
  size: z.enum(SIZES).nullable(),
  bucket: z.string().nullable(),
  estimate_min: z.number().nullable(),
  parent_id: z.string().nullable(),
});

const ACTIVE: readonly TaskStatus[] = ["todo", "doing"];

export function toTask(row: unknown): Task {
  const r = TaskRow.parse(row);
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    nowStep: r.now_step,
    source: r.source,
    sourceRef: r.source_ref,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    completedAt: r.completed_at,
    size: r.size,
    bucket: r.bucket,
    estimateMin: r.estimate_min,
    parentId: r.parent_id,
  };
}

export function getTask(ctx: Ctx, id: string): Result<Task> {
  const row = ctx.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  return row ? ok(toTask(row)) : fail("not_found", `No task with id ${id}. It may have been deleted.`);
}

export function addTask(ctx: Ctx, input: unknown): Result<Task> {
  const parsed = NewTaskInput.safeParse(input);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  const { title, source, sourceRef, nowStep, size, bucket } = parsed.data;
  const now = ctx.now();
  const id = ctx.newId();
  ctx.db
    .prepare(
      `INSERT INTO tasks (id, title, status, now_step, source, source_ref, position, created_at, updated_at, size, bucket)
       VALUES (?, ?, 'todo', ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks), ?, ?, ?, ?)`,
    )
    .run(id, title, nowStep, source, sourceRef, now, now, size, bucket);
  return getTask(ctx, id);
}

/**
 * Put an open task at `place` among its siblings (same parent), then number every open task again in the order the list
 * shows: each top-level task followed by its steps. Positions stay small whole numbers, and the first row stays a top-level task.
 */
function placeTask(ctx: Ctx, task: Task, place: number): void {
  const open = listTasks(ctx);
  const siblings = open.filter((t) => t.parentId === task.parentId && t.id !== task.id);
  siblings.splice(Math.min(place, siblings.length), 0, task);
  const ordered = task.parentId === null ? siblings.flatMap((parent) => [parent, ...open.filter((t) => t.parentId === parent.id)]) : open.filter((t) => t.parentId !== task.parentId).concat(siblings);
  const update = ctx.db.prepare("UPDATE tasks SET position = ? WHERE id = ?");
  ordered.forEach((t, index) => update.run(index + 1, t.id));
}

/** Change a task's words, next step, place, size, bucket or estimate; a field left out stays as it is. */
export function patchTask(ctx: Ctx, id: string, input: unknown): Result<Task> {
  const parsed = TaskPatchInput.safeParse(input);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  const current = getTask(ctx, id);
  if (!current.ok) return current;
  const { place, ...fields } = parsed.data;
  const next = { ...current.value, ...fields };
  ctx.db
    .prepare("UPDATE tasks SET title = ?, now_step = ?, size = ?, bucket = ?, estimate_min = ?, updated_at = ? WHERE id = ?")
    .run(next.title, next.nowStep, next.size, next.bucket, next.estimateMin, ctx.now(), id);
  if (place !== undefined && ACTIVE.includes(current.value.status)) placeTask(ctx, current.value, place);
  return getTask(ctx, id);
}

/** Open tasks by default, in the order they were added. */
export function listTasks(ctx: Ctx, statuses: readonly TaskStatus[] = ACTIVE): Task[] {
  const marks = statuses.map(() => "?").join(", ");
  return ctx.db
    .prepare(`SELECT * FROM tasks WHERE status IN (${marks}) ORDER BY position, rowid`)
    .all(...statuses)
    .map(toTask);
}

function transition(ctx: Ctx, id: string, to: TaskStatus, allowedFrom: readonly TaskStatus[]): Result<Task> {
  const current = getTask(ctx, id);
  if (!current.ok) return current;
  if (current.value.status === to) return current;
  if (!allowedFrom.includes(current.value.status)) {
    return fail("conflict", `Can't move a ${current.value.status} task to ${to}.`);
  }
  const now = ctx.now();
  ctx.db
    .prepare("UPDATE tasks SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?")
    .run(to, now, to === "done" ? now : null, id);
  return getTask(ctx, id);
}

export const completeTask = (ctx: Ctx, id: string) => transition(ctx, id, "done", ["todo", "doing"]);
export const dropTask = (ctx: Ctx, id: string) => transition(ctx, id, "dropped", ["todo", "doing"]);
/** Undo for drop and complete. */
export const restoreTask = (ctx: Ctx, id: string) => transition(ctx, id, "todo", ["dropped", "done"]);
export const startTask = (ctx: Ctx, id: string) => transition(ctx, id, "doing", ["todo"]);

export function setNowStep(ctx: Ctx, id: string, step: string | null): Result<Task> {
  const trimmed = step?.trim() ?? null;
  if (trimmed !== null && (trimmed.length === 0 || trimmed.length > 500)) {
    return fail("invalid", "Next step must be 1 to 500 characters, or null to clear it.");
  }
  const current = getTask(ctx, id);
  if (!current.ok) return current;
  ctx.db.prepare("UPDATE tasks SET now_step = ?, updated_at = ? WHERE id = ?").run(trimmed, ctx.now(), id);
  return getTask(ctx, id);
}
