import type { TaskDto } from "../../shared/api";
import type { Method, MethodNumbers } from "../../shared/method";
import { minutesForSize } from "./size-model";

export const QUICK = "quick";

/** The box the Now clock offers: a "Do it now" task under the two-minute rule gets the rule's minutes; anything else its size's. */
export function boxMinutes(task: TaskDto, method: Method, numbers: MethodNumbers): number | null {
  if (method.structure === "two-minute" && task.bucket === QUICK) return numbers.quickMin;
  return minutesForSize(task.size, numbers);
}
