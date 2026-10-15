import { describe, expect, it } from "vitest";
import { isPreference, parsePreference, resolveAppearance } from "./appearance";

describe("parsePreference", () => {
  it("keeps a saved light, dark or system choice", () => {
    for (const value of ["light", "dark", "system"]) expect(parsePreference(value)).toBe(value);
  });

  it("falls back to system for nothing, junk, or a different case", () => {
    for (const value of [null, "", "Dark", "auto", "blue"]) expect(parsePreference(value)).toBe("system");
  });
});

describe("resolveAppearance", () => {
  it("follows the Mac when the choice is system", () => {
    expect(resolveAppearance("system", true)).toBe("dark");
    expect(resolveAppearance("system", false)).toBe("light");
  });

  it("ignores the Mac when the person picked one", () => {
    expect(resolveAppearance("light", true)).toBe("light");
    expect(resolveAppearance("dark", false)).toBe("dark");
  });
});

describe("isPreference", () => {
  it("rejects non-strings", () => {
    expect(isPreference(1)).toBe(false);
    expect(isPreference(undefined)).toBe(false);
  });
});
