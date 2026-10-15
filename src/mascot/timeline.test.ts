import { describe, expect, it } from "vitest";
import { cellOrigin, frameAt, nearestAngleIndex, totalMs } from "./timeline";

const DURATIONS = [100, 200, 50];

describe("frameAt (looping)", () => {
  it("shows the frame whose time span contains the elapsed time", () => {
    expect(frameAt(DURATIONS, 0, true).index).toBe(0);
    expect(frameAt(DURATIONS, 99, true).index).toBe(0);
    expect(frameAt(DURATIONS, 100, true).index).toBe(1);
    expect(frameAt(DURATIONS, 299, true).index).toBe(1);
    expect(frameAt(DURATIONS, 300, true).index).toBe(2);
  });

  it("wraps around and never reports finished", () => {
    expect(totalMs(DURATIONS)).toBe(350);
    expect(frameAt(DURATIONS, 350, true)).toEqual({ index: 0, finished: false });
    expect(frameAt(DURATIONS, 350 * 40 + 120, true)).toEqual({ index: 1, finished: false });
  });

  it("does not drift: the frame depends only on the clock, however late a tick runs", () => {
    expect(frameAt(DURATIONS, 1_000_000_010, true).index).toBe(frameAt(DURATIONS, 1_000_000_010 % 350, true).index);
  });
});

describe("frameAt (one-shot)", () => {
  it("holds the last frame and reports finished at the end", () => {
    expect(frameAt(DURATIONS, 349, false)).toEqual({ index: 2, finished: false });
    expect(frameAt(DURATIONS, 350, false)).toEqual({ index: 2, finished: true });
    expect(frameAt(DURATIONS, 9_999, false)).toEqual({ index: 2, finished: true });
  });

  it("treats a negative start as the first frame", () => {
    expect(frameAt(DURATIONS, -5, false).index).toBe(0);
  });
});

describe("cellOrigin", () => {
  it("is the top-left of a frame in a grid", () => {
    expect(cellOrigin({ cellWidth: 192, cellHeight: 208 }, 3, 2)).toEqual({ x: 384, y: 624 });
  });
});

describe("nearestAngleIndex", () => {
  const angles = [0, 90, 180, 270];

  it("picks the closest sample", () => {
    expect(nearestAngleIndex(angles, 10)).toBe(0);
    expect(nearestAngleIndex(angles, 100)).toBe(1);
    expect(nearestAngleIndex(angles, 200)).toBe(2);
  });

  it("wraps around the circle: 359 is next to 0, -10 is next to 0", () => {
    expect(nearestAngleIndex(angles, 359)).toBe(0);
    expect(nearestAngleIndex(angles, -10)).toBe(0);
    expect(nearestAngleIndex(angles, 725)).toBe(0);
  });
});
