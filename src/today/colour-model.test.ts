import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { HUES, hashOf, hueFor } from "./colour-model";

const task = (id: string, over: Partial<TaskDto> = {}): TaskDto => ({ id, title: id, status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 0, createdAt: 0, updatedAt: 0, completedAt: null, size: null, bucket: null, estimateMin: null, parentId: null, ...over });

describe("a task's colour", () => {
  it("is stable for the same id and spread over the hues", () => {
    expect(hashOf("abc")).toBe(hashOf("abc"));
    expect(hashOf("abc")).not.toBe(hashOf("abd"));
    const seen = new Set(Array.from({ length: 200 }, (_, i) => hueFor(task(`id-${i}`), { structure: "none" })));
    expect(seen.size).toBe(HUES.length);
    expect(hueFor(task("x", { title: "renamed" }), { structure: "none" })).toBe(hueFor(task("x"), { structure: "none" }));
  });

  it("follows the bucket when a structure is on, and the id when not", () => {
    const rock = task("r", { bucket: "rock" });
    expect(hueFor(rock, { structure: "pickle-jar" })).toBe("plum");
    expect(hueFor(task("s", { bucket: "sand" }), { structure: "pickle-jar" })).toBe("amber");
    expect(hueFor(rock, { structure: "none" })).toBe(hueFor(task("r"), { structure: "none" }));
    expect(hueFor(task("u", { bucket: "unknown" }), { structure: "pickle-jar" })).toBe(hueFor(task("u"), { structure: "none" }));
  });

  it("gives a step its task's hue", () => {
    const parent = task("big", { bucket: "sand" });
    const step = task("step", { parentId: "big" });
    expect(hueFor(step, { structure: "none", parent })).toBe(hueFor(parent, { structure: "none" }));
    expect(hueFor(step, { structure: "pickle-jar", parent })).toBe("amber");
  });
});
