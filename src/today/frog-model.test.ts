import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { FROG_PROMPT, frogMeter, frogOf, frogPatches } from "./frog-model";

const task = (id: string, bucket: string | null = null): TaskDto => ({ id, title: id, status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 0, createdAt: 0, updatedAt: 0, completedAt: null, size: null, bucket, estimateMin: null, parentId: null });

describe("frogOf", () => {
  it("is the task marked frog, or null", () => {
    expect(frogOf([task("a"), task("b", "frog")])?.id).toBe("b");
    expect(frogOf([task("a", "rest")])).toBeNull();
  });
});

describe("frogPatches", () => {
  it("marks the task and sends the old frog to the rest", () => {
    const patches = frogPatches([task("a", "frog"), task("b")], task("b"));
    expect(patches.map((p) => [p.task.id, p.bucket])).toEqual([["b", "frog"], ["a", "rest"]]);
  });
  it("marks the only frog with one write, and re-marking the frog itself is one write", () => {
    expect(frogPatches([task("a")], task("a"))).toHaveLength(1);
    expect(frogPatches([task("a", "frog")], task("a", "frog"))).toHaveLength(1);
  });
});

describe("frogMeter", () => {
  it("says nothing with no tasks or once a frog is marked", () => {
    expect(frogMeter([])).toBeNull();
    expect(frogMeter([task("a", "frog"), task("b")])).toBeNull();
  });
  it("nudges to pick one while none is marked", () => {
    expect(frogMeter([task("a"), task("b", "rest")])).toEqual({ line: "No frog yet.", ask: { label: "Pick the frog", prompt: FROG_PROMPT } });
  });
});
