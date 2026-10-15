import { describe, expect, it } from "vitest";
import { ManifestSchema, validateManifest, type Manifest } from "./manifest";

const good = (): Manifest =>
  ManifestSchema.parse({
    image: "x.png",
    width: 384,
    height: 416,
    columns: 2,
    cellWidth: 192,
    cellHeight: 208,
    rows: [
      { name: "idle", row: 0, frames: 2, durationsMs: [100, 200] },
      { name: "look", row: 1, frames: 2, anglesDegrees: [0, 180] },
    ],
  });

describe("validateManifest", () => {
  it("accepts a consistent manifest", () => {
    expect(validateManifest(good())).toEqual([]);
  });

  it("says when the sheet width is not columns x cell width", () => {
    expect(validateManifest({ ...good(), width: 400 })[0]).toContain("width 400");
  });

  it("says when an action has a different number of durations than frames", () => {
    const m = good();
    m.rows[0] = { name: "idle", row: 0, frames: 2, durationsMs: [100] };
    expect(validateManifest(m)).toEqual(['"idle" has 2 frames but 1 durations']);
  });

  it("says when a row, frame count, angle count or name is wrong", () => {
    const m = good();
    m.rows = [
      { name: "a", row: 5, frames: 2, durationsMs: [1, 1] },
      { name: "b", row: 0, frames: 3, durationsMs: [1, 1, 1] },
      { name: "c", row: 1, frames: 2, anglesDegrees: [0] },
      { name: "a", row: 0, frames: 1, durationsMs: [1] },
    ];
    const problems = validateManifest(m).join(" | ");
    expect(problems).toContain('"a" is on row 5, below the sheet');
    expect(problems).toContain('"b" has 3 frames but the sheet has 2 columns');
    expect(problems).toContain('"c" has 2 frames but 1 angles');
    expect(problems).toContain('"a" appears twice');
  });

  it("rejects a manifest that is not even the right shape", () => {
    expect(ManifestSchema.safeParse({ image: "x.png" }).success).toBe(false);
    expect(ManifestSchema.safeParse({ ...good(), rows: [{ name: "idle", row: 0, frames: 1, durationsMs: [0] }] }).success).toBe(false);
  });
});
