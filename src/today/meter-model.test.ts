import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { DEFAULT_METHOD_NUMBERS, type Method } from "../../shared/method";
import { meterFor } from "./meter-model";

const task = (bucket: string | null, size: TaskDto["size"] = null): TaskDto => ({ id: `${bucket}-${size}-${Math.random()}`, title: "t", status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 0, createdAt: 0, updatedAt: 0, completedAt: null, size, bucket, estimateMin: null, parentId: null });
const method = (structure: Method["structure"], sizing: Method["sizing"] = "none"): Method => ({ timer: "timebox", structure, sizing });

describe("meterFor", () => {
  it("is nothing with no structure and no sizes", () => {
    expect(meterFor([task(null)], method("none"), DEFAULT_METHOD_NUMBERS)).toBeNull();
  });
  it("is the jar's line, with the calm sentence and one way out when it is full", () => {
    expect(meterFor([task("rock")], method("pickle-jar"), DEFAULT_METHOD_NUMBERS)).toEqual({ line: "1 rock, 0 pebbles" });
    const full = meterFor([task("rock"), task("rock"), task("rock")], method("pickle-jar"), DEFAULT_METHOD_NUMBERS);
    expect(full).toMatchObject({ note: "That's a full day.", ask: { label: "Park something" } });
    expect(meterFor([task(null)], method("pickle-jar"), DEFAULT_METHOD_NUMBERS)).toBeNull();
  });
  it("is the frog's nudge until one is marked, then falls back to the day's minutes when sizes are on", () => {
    expect(meterFor([task(null)], method("frog"), DEFAULT_METHOD_NUMBERS)).toMatchObject({ line: "No frog yet." });
    expect(meterFor([task("frog", "m")], method("frog", "tshirt"), DEFAULT_METHOD_NUMBERS)).toEqual({ line: "about 50 min on the list" });
    expect(meterFor([task("frog")], method("frog"), DEFAULT_METHOD_NUMBERS)).toBeNull();
  });
  it("is the count picked for Ivy Lee", () => {
    expect(meterFor([task("six"), task("six")], method("ivy-lee"), DEFAULT_METHOD_NUMBERS)).toEqual({ line: "2 of 6 picked" });
  });
  it("is the three slots for 1-3-5", () => {
    expect(meterFor([task("small")], method("one-three-five"), DEFAULT_METHOD_NUMBERS)).toEqual({ line: "Big 0 of 1 · Medium 0 of 3 · Small 1 of 5" });
  });
});
