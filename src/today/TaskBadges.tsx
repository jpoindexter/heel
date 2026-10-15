import { Badge } from "@radix-ui/themes";
import type { TaskDto } from "../../shared/api";
import type { Method } from "../../shared/method";
import { bucketLabel, nextBucket, nextSize, sizeLabel } from "./method-model";

export type Patch = (task: TaskDto, patch: { size?: TaskDto["size"]; bucket?: string | null }) => void;

type Props = { task: TaskDto; method: Method; onPatch: Patch };

/** The small marks a method adds to a row: a size (XS–XL) and a bucket. A tap walks to the next value; none is a value too. */
export function TaskBadges({ task, method, onPatch }: Props) {
  const showSize = method.sizing === "tshirt";
  const showBucket = method.structure !== "none";
  if (!showSize && !showBucket) return null;
  return (
    <span className="task-badges">
      {showBucket && (
        <Badge asChild size="1" variant={task.bucket ? "soft" : "outline"} color="gray" radius="full">
          <button type="button" aria-label={`Bucket: ${bucketLabel(task.bucket)}. Change`} onClick={() => onPatch(task, { bucket: nextBucket(method.structure, task.bucket) })}>
            {bucketLabel(task.bucket)}
          </button>
        </Badge>
      )}
      {showSize && (
        <Badge asChild size="1" variant={task.size ? "soft" : "outline"} color="gray" radius="full">
          <button type="button" aria-label={`Size: ${sizeLabel(task.size)}. Change`} onClick={() => onPatch(task, { size: nextSize(task.size) })}>
            {sizeLabel(task.size)}
          </button>
        </Badge>
      )}
    </span>
  );
}
