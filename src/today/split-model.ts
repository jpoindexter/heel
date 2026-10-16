import type { TaskDto } from "../../shared/api";

/** A task with its open steps under it (a step whose parent is not on the list stands on its own). */
export type TaskNode = { task: TaskDto; steps: TaskDto[] };

export function nest(tasks: readonly TaskDto[]): TaskNode[] {
  const ids = new Set(tasks.map((task) => task.id));
  const nodes = new Map<string, TaskNode>();
  const order: TaskNode[] = [];
  for (const task of tasks) {
    if (task.parentId && ids.has(task.parentId)) continue;
    const node = { task, steps: [] };
    nodes.set(task.id, node);
    order.push(node);
  }
  for (const task of tasks) {
    if (task.parentId && ids.has(task.parentId)) nodes.get(task.parentId)?.steps.push(task);
  }
  return order;
}

/** "2 of 5" for a task that has or had steps; nothing for a plain task. */
export function progressLabel(task: TaskDto, openSteps: number): string | null {
  const done = task.stepsDone ?? 0;
  const total = done + openSteps;
  return total === 0 ? null : `${done} of ${total}`;
}

/** The first open step of the first task, when it has one: that is the thing to do now. */
export function firstStep(tasks: readonly TaskDto[]): { step: TaskDto; parent: TaskDto } | null {
  const first = nest(tasks)[0];
  const step = first?.steps[0];
  return first && step ? { step, parent: first.task } : null;
}
