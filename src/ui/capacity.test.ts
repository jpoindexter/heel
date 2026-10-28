import { describe, expect, it } from "vitest";
import { isReduced, parseCapacity, reducedLine } from "./capacity";

describe("capacity", () => {
  it("reads a saved value and falls back to Normal for anything else", () => {
    expect(parseCapacity("low")).toBe("low");
    expect(parseCapacity("off")).toBe("off");
    expect(parseCapacity(null)).toBe("normal");
    expect(parseCapacity("overwhelmed")).toBe("normal");
  });

  it("treats Low and Off as reduced, Normal as not", () => {
    expect(isReduced("normal")).toBe(false);
    expect(isReduced("low")).toBe(true);
    expect(isReduced("off")).toBe(true);
  });

  it("says how many wait, with the right number word, and nothing when none do", () => {
    expect(reducedLine("low", 0)).toBe("Low capacity today: one thing at a time.");
    expect(reducedLine("low", 1)).toBe("Low capacity today: one thing at a time. 1 more waits.");
    expect(reducedLine("off", 4)).toBe("Off today: one thing, nothing else. 4 more wait.");
  });
});
