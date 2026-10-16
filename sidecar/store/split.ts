import { SplitInputSchema } from "../../shared/api";
import { inTransaction, type Ctx } from "./context";
import { fail, ok, type Result } from "./result";
import { firstIssue, type Task } from "./schema";
import { addTask, getTask, toTask } from "./tasks";

/** The open steps of a task, in order. */
export function childrenOf(ctx: Ctx, parentId: string): Task[] {
  return ctx.db.prepare("SELECT * FROM tasks WHERE parent_id = ? AND status IN ('todo', 'doing') ORDER BY position, rowid").all(parentId).map(toTask);
}

/**
 * Make the steps the person confirmed into tasks under the parent, in one transaction: all or none. They sit right
 * after the parent (same position, later rows). A step of a step is refused: one level keeps the list readable.
 */
export function splitTask(ctx: Ctx, parentId: string, input: unknown): Result<{ parent: Task; children: Task[] }> {
  const parsed = SplitInputSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  const parent = getTask(ctx, parentId);
  if (!parent.ok) return parent;
  if (parent.value.status === "done" || parent.value.status === "dropped") return fail("conflict", "That task is finished. Restore it first to split it.");
  if (parent.value.parentId) return fail("conflict", "That is already a step of a bigger task. Split the bigger one.");
  return inTransaction(ctx, () => {
    const children: Task[] = [];
    for (const title of parsed.data.titles) {
      const added = addTask(ctx, { title, source: "manual" });
      if (!added.ok) return added;
      ctx.db.prepare("UPDATE tasks SET parent_id = ?, position = ? WHERE id = ?").run(parentId, parent.value.position, added.value.id);
      const child = getTask(ctx, added.value.id);
      if (!child.ok) return child;
      children.push(child.value);
    }
    return ok({ parent: parent.value, children });
  });
}

/** Undo for a split: the open steps are dropped (finished ones stay on record). Returns how many went. */
export function unsplitTask(ctx: Ctx, parentId: string): Result<{ count: number }> {
  const parent = getTask(ctx, parentId);
  if (!parent.ok) return parent;
  const result = ctx.db.prepare("UPDATE tasks SET status = 'dropped', updated_at = ? WHERE parent_id = ? AND status IN ('todo', 'doing')").run(ctx.now(), parentId);
  return ok({ count: Number(result.changes) });
}

/** How many finished steps each parent has, so the list can say "2 of 5". */
export function doneStepCounts(ctx: Ctx): Record<string, number> {
  const rows = ctx.db.prepare("SELECT parent_id, COUNT(*) AS n FROM tasks WHERE status = 'done' AND parent_id IS NOT NULL GROUP BY parent_id").all() as { parent_id: string; n: number }[];
  return Object.fromEntries(rows.map((row) => [String(row.parent_id), Number(row.n)]));
}
