import { describe, expect, it } from "vitest";
import { replyAlignment, shouldFocusAskBox } from "./focus-rules";

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

describe("replyAlignment", () => {
  it("starts a long answer at its first line and ends a short one at the bottom", () => {
    expect(replyAlignment(900, 400)).toBe("start");
    expect(replyAlignment(120, 400)).toBe("end");
    expect(replyAlignment(400, 400)).toBe("end");
  });
});
