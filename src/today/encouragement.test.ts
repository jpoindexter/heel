import { describe, expect, it } from "vitest";
import { countLine, encouragement, lineOf, shortTitle } from "./encouragement";

describe("countLine", () => {
  it("says the first few in words and the rest as a number, never a streak or a score", () => {
    expect([1, 2, 3, 4, 12].map(countLine)).toEqual(["That's one.", "Two down.", "Three today.", "4 today.", "12 today."]);
  });
});

describe("shortTitle", () => {
  it("keeps short titles and cuts long ones with an ellipsis", () => {
    expect(shortTitle("  Fold the laundry ")).toBe("Fold the laundry");
    const long = shortTitle("Ring the insurer about the vaccination claim form");
    expect(long.length).toBeLessThanOrEqual(28);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("encouragement", () => {
  it("names the task and never repeats the last line", () => {
    const seen = new Set<string>();
    let last: string | null = null;
    for (let i = 0; i < 40; i += 1) {
      const message = encouragement({ title: "Water the plants", doneToday: 2, last, rng: () => (i * 0.37) % 1 });
      expect(message.startsWith("Water the plants · ")).toBe(true);
      const line = lineOf(message);
      expect(line).not.toBe(last);
      seen.add(line);
      last = line;
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it("can use the day's count", () => {
    expect(encouragement({ title: "A", doneToday: 3, last: null, rng: () => 0 })).toBe("A · Three today.");
  });
});
