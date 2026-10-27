import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { DEFAULT_METHOD_NUMBERS } from "../../shared/method";
import { oneThreeFiveMeter, slotsFor } from "./one-three-five-model";

const task = (bucket: string | null): TaskDto => ({ id: `${bucket}-${Math.random()}`, title: "t", status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 0, createdAt: 0, updatedAt: 0, completedAt: null, size: null, bucket, estimateMin: null, parentId: null });

describe("slotsFor", () => {
  it("counts each slot against what the day holds", () => {
    expect(slotsFor([task("big"), task("medium"), task("medium"), task(null)], DEFAULT_METHOD_NUMBERS)).toEqual([
      { bucket: "big", used: 1, holds: 1 },
      { bucket: "medium", used: 2, holds: 3 },
      { bucket: "small", used: 0, holds: 5 },
    ]);
  });
});

describe("oneThreeFiveMeter", () => {
  it("shows the slots, empty ones too, and nothing with no tasks", () => {
    expect(oneThreeFiveMeter([], DEFAULT_METHOD_NUMBERS)).toBeNull();
    expect(oneThreeFiveMeter([task(null)], DEFAULT_METHOD_NUMBERS)).toEqual({ line: "Big 0 of 1 · Medium 0 of 3 · Small 0 of 5" });
  });
  it("adds a calm sentence and one way out when a slot is over, with the numbers in the question", () => {
    const meter = oneThreeFiveMeter([task("big"), task("big")], DEFAULT_METHOD_NUMBERS);
    expect(meter).toMatchObject({ line: "Big 2 of 1 · Medium 0 of 3 · Small 0 of 5", note: "That's 2 big ones; the day holds 1.", ask: { label: "Park one" } });
    expect(meter?.ask?.prompt).toContain("holds 1 big task and there are 2");
  });
  it("follows the numbers from Settings", () => {
    const numbers = { ...DEFAULT_METHOD_NUMBERS, slots: { big: 2, medium: 2, small: 2 } };
    expect(oneThreeFiveMeter([task("big"), task("big")], numbers)).toEqual({ line: "Big 2 of 2 · Medium 0 of 2 · Small 0 of 2" });
  });
});
