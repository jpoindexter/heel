import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { DEFAULT_METHOD_NUMBERS } from "../../shared/method";
import { ivyLeeMeter, sixOf } from "./ivy-lee-model";

const task = (bucket: string | null): TaskDto => ({ id: `${bucket}-${Math.random()}`, title: "t", status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 0, createdAt: 0, updatedAt: 0, completedAt: null, size: null, bucket, estimateMin: null, parentId: null });
const picked = (n: number) => Array.from({ length: n }, () => task("six"));

describe("sixOf", () => {
  it("is the tasks marked six, in list order", () => {
    expect(sixOf([task(null), task("six"), task("six")])).toHaveLength(2);
  });
});

describe("ivyLeeMeter", () => {
  it("is nothing with no tasks, and the count alone once the six are picked", () => {
    expect(ivyLeeMeter([], DEFAULT_METHOD_NUMBERS)).toBeNull();
    expect(ivyLeeMeter(picked(6), DEFAULT_METHOD_NUMBERS)).toEqual({ line: "6 of 6 picked" });
  });
  it("offers to pick while fewer than the count are picked and tasks are left unsorted", () => {
    expect(ivyLeeMeter([task("six"), task(null)], DEFAULT_METHOD_NUMBERS)).toMatchObject({ line: "1 of 6 picked", ask: { label: "Pick the 6" } });
    expect(ivyLeeMeter([task("six"), task("six")], DEFAULT_METHOD_NUMBERS)).toEqual({ line: "2 of 6 picked" });
  });
  it("stops at the count with a calm sentence and one way out, and follows the number from Settings", () => {
    expect(ivyLeeMeter(picked(7), DEFAULT_METHOD_NUMBERS)).toMatchObject({ line: "7 of 6 picked", note: "That's 7. Ivy Lee stops at 6.", ask: { label: "Park one" } });
    expect(ivyLeeMeter(picked(3), { ...DEFAULT_METHOD_NUMBERS, ivyLeeCount: 3 })).toEqual({ line: "3 of 3 picked" });
  });
});
