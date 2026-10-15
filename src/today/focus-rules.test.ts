import { describe, expect, it } from "vitest";
import { revealBlock, shouldFocusAskBox } from "./focus-rules";

describe("shouldFocusAskBox", () => {
  it("focuses the box when the Today tab is showing and nothing else has focus", () => {
    expect(shouldFocusAskBox(true, null)).toBe(true);
    expect(shouldFocusAskBox(true, "BODY")).toBe(true);
    expect(shouldFocusAskBox(true, "TEXTAREA")).toBe(true);
  });

  it("never takes focus while another tab is showing", () => {
    expect(shouldFocusAskBox(false, "BODY")).toBe(false);
  });

  it("does not steal focus from a button, field or link the person is using", () => {
    for (const tag of ["BUTTON", "INPUT", "SELECT", "A"]) expect(shouldFocusAskBox(true, tag)).toBe(false);
  });
});

describe("revealBlock", () => {
  it("shows the start of a finished answer, and just keeps the thinking line in view", () => {
    expect(revealBlock(true)).toBe("start");
    expect(revealBlock(false)).toBe("nearest");
  });
});
