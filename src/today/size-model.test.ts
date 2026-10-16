import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { DEFAULT_METHOD_NUMBERS } from "../../shared/method";
import { dayTotal, minutesForSize, splitPrompt, splitSuggested } from "./size-model";

const task = (size: TaskDto["size"]): TaskDto => ({ id: String(Math.random()), title: "t", status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 0, createdAt: 0, updatedAt: 0, completedAt: null, size, bucket: null, estimateMin: null, parentId: null });

describe("sizes to minutes", () => {
  it("maps a size through the numbers and says nothing for none", () => {
    expect(minutesForSize("m", DEFAULT_METHOD_NUMBERS)).toBe(50);
    expect(minutesForSize(null, DEFAULT_METHOD_NUMBERS)).toBeNull();
  });
  it("adds the day up and counts what is not sized", () => {
    expect(dayTotal([task("s"), task("l"), task(null)], DEFAULT_METHOD_NUMBERS)).toEqual({ minutes: 145, unsized: 1, line: "about 2 h 25 on the list (1 not sized)" });
    expect(dayTotal([task(null)], DEFAULT_METHOD_NUMBERS).line).toBe("");
  });
  it("offers a split for L and XL only", () => {
    expect(["xs", "s", "m", "l", "xl", null].map((s) => splitSuggested(s as never))).toEqual([false, false, false, true, true, false]);
    expect(splitPrompt("Move house")).toContain('"Move house"');
  });
});
