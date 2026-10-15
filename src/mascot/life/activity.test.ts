import { describe, expect, it } from "vitest";
import { DEFAULT_ACTIVITY, isActivity, parseActivity } from "./activity";

describe("parseActivity", () => {
  it("keeps a saved off, calm or lively", () => {
    for (const value of ["off", "calm", "lively"]) expect(parseActivity(value)).toBe(value);
  });

  it("falls back to calm for nothing, junk or a different case", () => {
    expect(DEFAULT_ACTIVITY).toBe("calm");
    for (const value of [null, "", "Lively", "wild"]) expect(parseActivity(value)).toBe("calm");
  });
});

describe("isActivity", () => {
  it("rejects non-strings", () => {
    expect(isActivity(2)).toBe(false);
    expect(isActivity(undefined)).toBe(false);
  });
});
