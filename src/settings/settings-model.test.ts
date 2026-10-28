import { describe, expect, it } from "vitest";
import { workSummary } from "./settings-model";
import { numberToCommit, parseWanderList } from "./settings-model";

describe("numberToCommit", () => {
  it("stores a changed positive number, hours with a fraction included", () => {
    expect(numberToCommit("30", 25)).toBe(30);
    expect(numberToCommit(" 7.5 ", 4)).toBe(7.5);
  });
  it("stores nothing for an emptied field, nonsense, zero or the same number (so Tab through a field writes nothing)", () => {
    for (const text of ["", "   ", "abc", "0", "-5", "25"]) expect(numberToCommit(text, 25)).toBeNull();
  });
});

describe("parseWanderList", () => {
  it("takes one bundle id per line and drops blanks and edges", () => {
    expect(parseWanderList(" com.a \n\n com.b\n")).toEqual(["com.a", "com.b"]);
    expect(parseWanderList("")).toEqual([]);
  });
});

describe("workSummary", () => {
  const method = { timer: "timebox", structure: "pickle-jar", sizing: "none" } as const;
  it("leads with the capacity when the day is Low or Off, and says nothing about it on a Normal day", () => {
    expect(workSummary(method)).toBe("Time-box · Pickle jar");
    expect(workSummary(method, "low")).toBe("Low capacity · Time-box · Pickle jar");
    expect(workSummary(method, "off")).toBe("Off capacity · Time-box · Pickle jar");
  });
});
