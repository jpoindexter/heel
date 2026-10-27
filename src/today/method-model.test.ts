import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { bucketLabel, bucketPatches, groupTasks, nextBucket, nextSize, orderTasks, sizeLabel } from "./method-model";
import { whatChanges } from "../ui/method";

const task = (title: string, bucket: string | null = null): TaskDto => ({
  id: title,
  title,
  status: "todo",
  nowStep: null,
  source: "manual",
  sourceRef: null,
  position: 0,
  createdAt: 0,
  updatedAt: 0,
  completedAt: null,
  size: null,
  bucket,
  estimateMin: null, parentId: null,
});

describe("groupTasks", () => {
  it("is one plain group with no structure", () => {
    expect(groupTasks([task("a"), task("b", "rock")], "none").map((g) => g.tasks.length)).toEqual([2]);
  });
  it("sorts the pickle jar: rocks, pebbles, sand, then what is not sorted yet; empty groups are left out", () => {
    const groups = groupTasks([task("sand", "sand"), task("loose"), task("rock", "rock"), task("odd", "big")], "pickle-jar");
    expect(groups.map((g) => [g.label, g.tasks.map((t) => t.title)])).toEqual([
      ["Rocks", ["rock"]],
      ["Sand", ["sand"]],
      ["Not sorted yet", ["loose", "odd"]],
    ]);
  });
});

describe("groupTasks under the two-minute rule", () => {
  it("puts Do it now first and the rest under Not sorted yet", () => {
    const groups = groupTasks([task("slow"), task("fast", "quick")], "two-minute");
    expect(groups.map((g) => [g.label, g.tasks.map((t) => t.title)])).toEqual([["Do it now", ["fast"]], ["Not sorted yet", ["slow"]]]);
  });
});

describe("nextSize / nextBucket", () => {
  it("walk the scale and come back to none", () => {
    expect(nextSize(null)).toBe("xs");
    expect(nextSize("m")).toBe("l");
    expect(nextSize("xl")).toBeNull();
    expect(nextBucket("pickle-jar", null)).toBe("rock");
    expect(nextBucket("pickle-jar", "sand")).toBeNull();
    expect(nextBucket("pickle-jar", "big")).toBe("rock");
    expect(nextBucket("none", "rock")).toBeNull();
  });
});

describe("labels and the Settings sentence", () => {
  it("name things in plain words", () => {
    expect(sizeLabel("xs")).toBe("XS");
    expect(sizeLabel(null)).toBe("Size");
    expect(bucketLabel("pebble")).toBe("Pebble");
    expect(whatChanges({ timer: "timebox", structure: "pickle-jar", sizing: "tshirt" })).toContain("Rocks, Pebbles and Sand");
    expect(whatChanges({ timer: "timebox", structure: "none", sizing: "none" })).toContain("one plain list");
  });
});

describe("orderTasks (the Now rule)", () => {
  it("puts the buckets first in their order and what has no bucket last, keeping the order within a bucket", () => {
    const ordered = orderTasks([task("loose"), task("rest1", "rest"), task("frog", "frog"), task("rest2", "rest"), task("odd", "big")], "frog");
    expect(ordered.map((t) => t.title)).toEqual(["frog", "rest1", "rest2", "loose", "odd"]);
    expect(orderTasks([task("b", "sand"), task("a", "rock")], "none").map((t) => t.title)).toEqual(["b", "a"]);
  });
});

describe("bucketPatches", () => {
  it("writes the one task for most structures and demotes the old frog for the frog", () => {
    expect(bucketPatches("pickle-jar", [task("a", "rock")], task("b"), "rock")).toEqual([{ task: task("b"), bucket: "rock" }]);
    expect(bucketPatches("frog", [task("a", "frog")], task("b"), "frog").map((p) => [p.task.title, p.bucket])).toEqual([["b", "frog"], ["a", "rest"]]);
    expect(bucketPatches("frog", [task("a", "frog")], task("b"), null)).toEqual([{ task: task("b"), bucket: null }]);
  });
});
