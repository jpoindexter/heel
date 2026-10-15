import { describe, expect, it } from "vitest";
import { dueAt, extensionMin, isDue, rangeFor } from "./focus";

describe("rangeFor", () => {
  it("makes a best case under the guess and a worst case over it, always in order", () => {
    expect(rangeFor(25)).toEqual({ bestMin: 18, realisticMin: 25, worstMin: 38 });
    for (const minutes of [1, 2, 5, 15, 45, 60, 240]) {
      const { bestMin, realisticMin, worstMin } = rangeFor(minutes);
      expect(bestMin).toBeGreaterThanOrEqual(1);
      expect(bestMin).toBeLessThanOrEqual(realisticMin);
      expect(realisticMin).toBeLessThanOrEqual(worstMin);
    }
  });
});

describe("dueAt / isDue", () => {
  const session = { startedAt: 1_000_000, realisticMin: 25, worstMin: 38 };
  it("is due at the realistic end, not before", () => {
    expect(dueAt(session)).toBe(1_000_000 + 25 * 60_000);
    expect(isDue(session, dueAt(session) - 1)).toBe(false);
    expect(isDue(session, dueAt(session))).toBe(true);
  });
});

describe("extensionMin", () => {
  it("adds the gap to the worst case, and never less than five minutes", () => {
    expect(extensionMin({ startedAt: 0, realisticMin: 25, worstMin: 38 })).toBe(13);
    expect(extensionMin({ startedAt: 0, realisticMin: 15, worstMin: 16 })).toBe(5);
  });
});
