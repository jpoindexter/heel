import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { firstStep, nest, progressLabel } from "./split-model";

const task = (id: string, parentId: string | null = null, stepsDone?: number): TaskDto => ({ id, title: id, status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 0, createdAt: 0, updatedAt: 0, completedAt: null, size: null, bucket: null, estimateMin: null, parentId, stepsDone });

describe("steps under a task", () => {
  it("nests open steps under their parent and leaves an orphan on its own", () => {
    const nodes = nest([task("big"), task("s1", "big"), task("other"), task("s2", "big"), task("lost", "gone")]);
    expect(nodes.map((n) => [n.task.id, n.steps.map((s) => s.id)])).toEqual([["big", ["s1", "s2"]], ["other", []], ["lost", []]]);
  });

  it("says how far along a split task is, and nothing for a plain one", () => {
    expect(progressLabel(task("big", null, 2), 3)).toBe("2 of 5");
    expect(progressLabel(task("big"), 2)).toBe("0 of 2");
    expect(progressLabel(task("big", null, 3), 0)).toBe("3 of 3");
    expect(progressLabel(task("plain"), 0)).toBeNull();
  });

  it("makes the first open step of the first task the thing to do now", () => {
    expect(firstStep([task("big"), task("s1", "big"), task("s2", "big")])).toEqual({ step: task("s1", "big"), parent: task("big") });
    expect(firstStep([task("plain"), task("big"), task("s1", "big")])).toBeNull();
    expect(firstStep([])).toBeNull();
  });
});
