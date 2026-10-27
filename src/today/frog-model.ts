import type { TaskDto } from "../../shared/api";
import type { Meter } from "./meter-model";

export const FROG = "frog";
export const REST = "rest";

/** The one task marked as the frog: the hardest one, done first. The first wins if the data ever holds two. */
export const frogOf = (tasks: readonly TaskDto[]): TaskDto | null => tasks.find((t) => t.bucket === FROG) ?? null;

/** Marking a task as the frog sends the old frog to the rest: one frog a day, and a tap is its own undo. */
export function frogPatches(tasks: readonly TaskDto[], task: TaskDto): { task: TaskDto; bucket: string }[] {
  const old = frogOf(tasks);
  return old && old.id !== task.id ? [{ task, bucket: FROG }, { task: old, bucket: REST }] : [{ task, bucket: FROG }];
}

/** What Heel is asked when no frog is marked yet. */
export const FROG_PROMPT = "Which task on my list is the frog: the hardest one, the one I would most like to avoid? Name one and say why in a line.";

/** Nothing to say while the frog is marked; a nudge to pick one while it is not. */
export function frogMeter(tasks: readonly TaskDto[]): Meter | null {
  if (tasks.length === 0 || frogOf(tasks)) return null;
  return { line: "No frog yet.", ask: { label: "Pick the frog", prompt: FROG_PROMPT } };
}
