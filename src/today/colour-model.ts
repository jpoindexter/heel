import type { TaskDto } from "../../shared/api";
import type { Structure } from "../../shared/method";

/** Nine calm Radix hues, far enough apart to tell at a glance; the accent (jade) is kept for Heel's own marks. */
export const HUES = ["blue", "teal", "grass", "amber", "orange", "tomato", "plum", "violet", "brown"] as const;
export type Hue = (typeof HUES)[number];

/** With a structure on, colour says the group too: one fixed hue per bucket, the same in every list. */
const BUCKET_HUES: Readonly<Record<string, Hue>> = { rock: "plum", pebble: "blue", sand: "amber", big: "plum", medium: "blue", small: "teal", do: "tomato", schedule: "blue", delegate: "amber", drop: "brown", frog: "grass", rest: "blue" };

/** A stable small number from a string (FNV-1a), so the same id always lands on the same hue. */
export function hashOf(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

type Context = { structure: Structure; /** The task this one is a step of, when it is on the list. */ parent?: TaskDto | null };

/**
 * Colour is identity: a task keeps one hue for life (from its id, so a rename changes nothing). A step wears its
 * task's hue. With a structure on, the bucket's hue wins, so a group reads as one colour; the bucket pill still says it in words.
 */
export function hueFor(task: TaskDto, { structure, parent }: Context): Hue {
  if (parent) return hueFor(parent, { structure });
  if (structure !== "none" && task.bucket && BUCKET_HUES[task.bucket]) return BUCKET_HUES[task.bucket]!;
  return HUES[hashOf(task.id) % HUES.length]!;
}
