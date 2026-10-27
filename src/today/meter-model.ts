import type { TaskDto } from "../../shared/api";
import type { Method, MethodNumbers, Sizing } from "../../shared/method";
import { frogMeter } from "./frog-model";
import { JAR_FULL_PROMPT, jarFor } from "./jar-model";
import { oneThreeFiveMeter } from "./one-three-five-model";
import { dayTotal } from "./size-model";

/** One quiet line over the list; `note` is the calm sentence when the day is over its rule, `ask` the one way out (a question to Heel). */
export type Meter = { line: string; note?: string; ask?: { label: string; prompt: string } };

function jarMeter(tasks: readonly TaskDto[], numbers: MethodNumbers, sizing: Sizing): Meter | null {
  const jar = jarFor(tasks, numbers, sizing);
  if (jar.rocks + jar.pebbles + jar.sand === 0) return null;
  return jar.full ? { line: jar.line, note: "That's a full day.", ask: { label: "Park something", prompt: JAR_FULL_PROMPT } } : { line: jar.line };
}

function structureMeter(tasks: readonly TaskDto[], method: Method, numbers: MethodNumbers): Meter | null {
  switch (method.structure) {
    case "pickle-jar":
      return jarMeter(tasks, numbers, method.sizing);
    case "frog":
      return frogMeter(tasks);
    case "one-three-five":
      return oneThreeFiveMeter(tasks, numbers);
    default:
      return null;
  }
}

/** The structure's line when it has one to say; otherwise the day's minutes when sizes are on; otherwise nothing. */
export function meterFor(tasks: readonly TaskDto[], method: Method, numbers: MethodNumbers): Meter | null {
  const structure = structureMeter(tasks, method, numbers);
  if (structure) return structure;
  if (method.sizing !== "tshirt") return null;
  const total = dayTotal(tasks, numbers);
  return total.line ? { line: total.line } : null;
}
