import type { TaskDto } from "../../shared/api";
import type { MethodNumbers } from "../../shared/method";
import type { Meter } from "./meter-model";

export const SIX = "six";

/** The tasks picked for tomorrow, in list order (reordering is N7's). */
export const sixOf = (tasks: readonly TaskDto[]): TaskDto[] => tasks.filter((t) => t.bucket === SIX);

/** What Heel is asked to help pick the six, and which one to park when there are more. */
export const pickPrompt = (count: number): string => `Which ${count} tasks on my list should tomorrow start with, most important first? Name them in order and say why in a line each.`;
export const overPrompt = (count: number, picked: number): string => `Ivy Lee stops at ${count} and I have picked ${picked}. Which one should I park, and why? Pick one.`;

/** "3 of 6 picked"; under the count with tasks still unsorted, a way to ask; over it, a calm sentence and one way out. */
export function ivyLeeMeter(tasks: readonly TaskDto[], numbers: MethodNumbers): Meter | null {
  if (tasks.length === 0) return null;
  const count = numbers.ivyLeeCount;
  const picked = sixOf(tasks).length;
  const line = `${picked} of ${count} picked`;
  if (picked > count) return { line, note: `That's ${picked}. Ivy Lee stops at ${count}.`, ask: { label: "Park one", prompt: overPrompt(count, picked) } };
  if (picked < count && picked < tasks.length) return { line, ask: { label: `Pick the ${count}`, prompt: pickPrompt(count) } };
  return { line };
}
