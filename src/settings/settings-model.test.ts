import { describe, expect, it } from "vitest";
import { numberToCommit } from "./settings-model";

describe("numberToCommit", () => {
  it("stores a changed positive number, hours with a fraction included", () => {
    expect(numberToCommit("30", 25)).toBe(30);
    expect(numberToCommit(" 7.5 ", 4)).toBe(7.5);
  });
  it("stores nothing for an emptied field, nonsense, zero or the same number (so Tab through a field writes nothing)", () => {
    for (const text of ["", "   ", "abc", "0", "-5", "25"]) expect(numberToCommit(text, 25)).toBeNull();
  });
});
