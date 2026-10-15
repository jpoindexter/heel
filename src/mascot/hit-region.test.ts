import { describe, expect, it } from "vitest";
import { OPAQUE_ALPHA, opaqueBounds, sameBox } from "./hit-region";

/** An RGBA buffer `width` x `height` with the given pixels opaque. */
function buffer(width: number, height: number, opaque: Array<[number, number]>, alpha = 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of opaque) data[(y * width + x) * 4 + 3] = alpha;
  return { data, width, height };
}

describe("opaqueBounds", () => {
  it("boxes the opaque pixels of a cell, relative to the cell", () => {
    const pixels = buffer(20, 20, [[12, 6], [15, 9]]);
    expect(opaqueBounds(pixels, { x: 10, y: 5, width: 10, height: 10 })).toEqual({ x: 2, y: 1, width: 4, height: 4 });
  });

  it("returns null for an empty cell", () => {
    expect(opaqueBounds(buffer(10, 10, []), { x: 0, y: 0, width: 10, height: 10 })).toBeNull();
  });

  it("ignores faint pixels (shadow, anti-alias fringe)", () => {
    const faint = buffer(10, 10, [[3, 3]], OPAQUE_ALPHA);
    expect(opaqueBounds(faint, { x: 0, y: 0, width: 10, height: 10 })).toBeNull();
  });

  it("does not look outside the cell", () => {
    const pixels = buffer(20, 10, [[2, 2], [15, 2]]);
    expect(opaqueBounds(pixels, { x: 0, y: 0, width: 10, height: 10 })).toEqual({ x: 2, y: 2, width: 1, height: 1 });
  });
});

describe("sameBox", () => {
  it("compares by value and treats two nulls as equal", () => {
    expect(sameBox({ x: 1, y: 2, width: 3, height: 4 }, { x: 1, y: 2, width: 3, height: 4 })).toBe(true);
    expect(sameBox({ x: 1, y: 2, width: 3, height: 4 }, { x: 1, y: 2, width: 3, height: 5 })).toBe(false);
    expect(sameBox(null, null)).toBe(true);
    expect(sameBox(null, { x: 0, y: 0, width: 1, height: 1 })).toBe(false);
  });
});
