import type { TaskDto } from "../../shared/api";
import type { MethodNumbers, Size } from "../../shared/method";
import { hoursText } from "./jar-model";

/** The sizes big enough that one box will not do: Heel offers to split them. */
export const SPLIT_SIZES: readonly Size[] = ["l", "xl"];

export const minutesForSize = (size: Size | null, numbers: MethodNumbers): number | null => (size ? numbers.sizeMinutes[size] : null);

/** The open list in minutes, over the tasks that have a size; how many have none. */
export function dayTotal(tasks: readonly TaskDto[], numbers: MethodNumbers): { minutes: number; unsized: number; line: string } {
  const sized = tasks.filter((t) => t.size !== null);
  const minutes = sized.reduce((sum, t) => sum + numbers.sizeMinutes[t.size!], 0);
  const unsized = tasks.length - sized.length;
  const line = sized.length === 0 ? "" : `about ${hoursText(minutes)} on the list${unsized > 0 ? ` (${unsized} not sized)` : ""}`;
  return { minutes, unsized, line };
}

export const splitSuggested = (size: Size | null): boolean => size !== null && SPLIT_SIZES.includes(size);

/** What Heel is asked when a big task should become small steps (N23 makes this a proper flow). */
export const splitPrompt = (title: string): string => `Split "${title}" into 3 to 5 small, concrete steps, each small enough for one short box, the easiest first. Add them as tasks and park nothing.`;
