import type { TaskDto } from "../../shared/api";
import { BUCKETS, BUCKET_LABELS, SIZES, SIZE_LABELS, type Size, type Structure } from "../../shared/method";

export type TaskGroup = { key: string; label: string; tasks: TaskDto[] };

const UNSORTED = "unsorted";
const GROUP_LABELS: Readonly<Record<string, string>> = { rock: "Rocks", pebble: "Pebbles", sand: "Sand", big: "Big", medium: "Medium", small: "Small", do: "Do", schedule: "Schedule", delegate: "Delegate", drop: "Drop", frog: "The frog", rest: "The rest", [UNSORTED]: "Not sorted yet" };

/** The list in the chosen structure's groups (buckets in their order, then what has no bucket yet), empty groups left out. No structure = one group. */
export function groupTasks(tasks: readonly TaskDto[], structure: Structure): TaskGroup[] {
  if (structure === "none") return [{ key: "all", label: "", tasks: [...tasks] }];
  const keys = [...BUCKETS[structure], UNSORTED];
  const groups = keys.map((key) => ({ key, label: GROUP_LABELS[key] ?? key, tasks: tasks.filter((t) => (t.bucket ?? UNSORTED) === key || (key === UNSORTED && t.bucket !== null && !BUCKETS[structure].includes(t.bucket))) }));
  return groups.filter((g) => g.tasks.length > 0);
}

/** A tap on the size badge walks XS → S → M → L → XL → none. */
export function nextSize(current: Size | null): Size | null {
  if (current === null) return SIZES[0];
  const index = SIZES.indexOf(current);
  return index >= SIZES.length - 1 ? null : (SIZES[index + 1] ?? null);
}

/** A tap on the bucket badge walks the structure's buckets, then none. */
export function nextBucket(structure: Structure, current: string | null): string | null {
  if (structure === "none") return null;
  const buckets = BUCKETS[structure];
  if (current === null || !buckets.includes(current)) return buckets[0] ?? null;
  const index = buckets.indexOf(current);
  return index >= buckets.length - 1 ? null : (buckets[index + 1] ?? null);
}

export const sizeLabel = (size: Size | null): string => (size ? SIZE_LABELS[size] : "Size");
export const bucketLabel = (bucket: string | null): string => (bucket ? (BUCKET_LABELS[bucket] ?? bucket) : "Bucket");
