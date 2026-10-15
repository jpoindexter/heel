import { describe, expect, it } from "vitest";
import { shouldFocusAskBox } from "./focus-rules";

describe("shouldFocusAskBox", () => {
  it("focuses the box when the Today screen is showing and nothing else has focus", () => {
    expect(shouldFocusAskBox(true, null)).toBe(true);
    expect(shouldFocusAskBox(true, "BODY")).toBe(true);
    expect(shouldFocusAskBox(true, "TEXTAREA")).toBe(true);
  });

  it("never takes focus while Settings is showing", () => {
    expect(shouldFocusAskBox(false, "BODY")).toBe(false);
  });

  it("does not steal focus from a button, field or link the person is using", () => {
    for (const tag of ["BUTTON", "INPUT", "SELECT", "A"]) expect(shouldFocusAskBox(true, tag)).toBe(false);
  });
});
