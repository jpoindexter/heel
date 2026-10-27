import type { TaskDto } from "../../shared/api";
import { BUCKET_LABELS, SLOT_BUCKETS, type MethodNumbers, type SlotBucket } from "../../shared/method";
import type { Meter } from "./meter-model";

export type Slot = { bucket: SlotBucket; used: number; holds: number };

/** How many tasks sit in each of the three slots, against what the day holds (Settings; 1, 3 and 5 by default). */
export const slotsFor = (tasks: readonly TaskDto[], numbers: MethodNumbers): Slot[] =>
  SLOT_BUCKETS.map((bucket) => ({ bucket, used: tasks.filter((t) => t.bucket === bucket).length, holds: numbers.slots[bucket] }));

/** What Heel is asked when a slot is over. */
export const overPrompt = (slot: Slot): string =>
  `The day holds ${slot.holds} ${BUCKET_LABELS[slot.bucket]!.toLowerCase()} ${slot.holds === 1 ? "task" : "tasks"} and there are ${slot.used}. Which one should I park, and why? Pick one.`;

/** "Big 1 of 1 · Medium 2 of 3 · Small 0 of 5"; the first slot over its count adds a calm sentence and one way out. */
export function oneThreeFiveMeter(tasks: readonly TaskDto[], numbers: MethodNumbers): Meter | null {
  if (tasks.length === 0) return null;
  const slots = slotsFor(tasks, numbers);
  const line = slots.map((s) => `${BUCKET_LABELS[s.bucket]} ${s.used} of ${s.holds}`).join(" · ");
  const over = slots.find((s) => s.used > s.holds);
  if (!over) return { line };
  const note = `That's ${over.used} ${BUCKET_LABELS[over.bucket]!.toLowerCase()} ones; the day holds ${over.holds}.`;
  return { line, note, ask: { label: "Park one", prompt: overPrompt(over) } };
}
