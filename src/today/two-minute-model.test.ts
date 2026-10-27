import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { DEFAULT_METHOD_NUMBERS, type Method } from "../../shared/method";
import { boxMinutes } from "./two-minute-model";

const task = (bucket: string | null, size: TaskDto["size"] = null): TaskDto => ({ id: "t", title: "t", status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 0, createdAt: 0, updatedAt: 0, completedAt: null, size, bucket, estimateMin: null, parentId: null });
const method = (structure: Method["structure"]): Method => ({ timer: "timebox", structure, sizing: "tshirt" });

describe("boxMinutes", () => {
  it("is the rule's minutes for a Do it now task, even when it has a size", () => {
    expect(boxMinutes(task("quick", "m"), method("two-minute"), DEFAULT_METHOD_NUMBERS)).toBe(2);
    expect(boxMinutes(task("quick"), method("two-minute"), { ...DEFAULT_METHOD_NUMBERS, quickMin: 5 })).toBe(5);
  });
  it("is the size's minutes otherwise, and nothing without a size", () => {
    expect(boxMinutes(task(null, "m"), method("two-minute"), DEFAULT_METHOD_NUMBERS)).toBe(50);
    expect(boxMinutes(task("quick", "m"), method("frog"), DEFAULT_METHOD_NUMBERS)).toBe(50);
    expect(boxMinutes(task(null), method("two-minute"), DEFAULT_METHOD_NUMBERS)).toBeNull();
  });
});
