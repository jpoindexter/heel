import { describe, expect, it } from "vitest";
import { MOTIONS, framePosition, isMotionName, motionDuration, SHEET_H } from "./atlas";

describe("framePosition", () => {
  it("returns the origin for the first idle frame", () => {
    expect(framePosition("idle", 0)).toEqual({ x: 0, y: 0 });
  });

  it("offsets by column and row for waving frame 3", () => {
    expect(framePosition("waving", 3)).toEqual({ x: -576, y: -624 });
  });

  it("wraps look frames onto the second row after eight frames", () => {
    expect(framePosition("look", 9)).toEqual({ x: -192, y: -2080 });
  });

  it("never points past the bottom of the sheet", () => {
    for (const name of Object.keys(MOTIONS) as (keyof typeof MOTIONS)[]) {
      const last = MOTIONS[name].times.length - 1;
      expect(-framePosition(name, last).y).toBeLessThan(SHEET_H);
    }
  });
});

describe("motion helpers", () => {
  it("sums frame times for a one-shot duration", () => {
    expect(motionDuration("waving")).toBe(700);
  });

  it("rejects unknown motion names", () => {
    expect(isMotionName("idle")).toBe(true);
    expect(isMotionName("dance")).toBe(false);
    expect(isMotionName(42)).toBe(false);
  });
});
