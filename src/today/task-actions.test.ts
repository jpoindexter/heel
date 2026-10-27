import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { lastStepParent } from "./task-actions";

const task = (id: string, parentId: string | null = null): TaskDto => ({ id, title: id, status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 0, createdAt: 0, updatedAt: 0, completedAt: null, size: null, bucket: null, estimateMin: null, parentId });

describe("lastStepParent", () => {
  it("names the parent only when the finished step was its last open one", () => {
    const big = task("big");
    expect(lastStepParent(task("s2", "big"), [big])).toEqual(big);
    expect(lastStepParent(task("s2", "big"), [big, task("s3", "big")])).toBeNull();
    expect(lastStepParent(task("plain"), [big])).toBeNull();
    expect(lastStepParent(task("s2", "gone"), [big])).toBeNull();
  });
});

describe("placeOf (N7)", () => {
  const task = (id: string, parentId: string | null = null) => ({ id, parentId }) as unknown as import("../../shared/api").TaskDto;
  it("counts a task's place among the open tasks that share its parent", async () => {
    const { placeOf } = await import("./task-actions");
    const open = [task("a"), task("a1", "a"), task("b"), task("a2", "a"), task("c")];
    expect(open.map((t) => placeOf(t, open))).toEqual([0, 0, 1, 1, 2]);
  });
});
