import { describe, expect, it } from "vitest";
import { DEFAULT_DENSITY, SCALING, isDensity, parseDensity } from "./density";

describe("density", () => {
  it("is compact unless the person chose otherwise", () => {
    expect(DEFAULT_DENSITY).toBe("compact");
    expect(parseDensity(null)).toBe("compact");
    expect(parseDensity("huge")).toBe("compact");
    expect(parseDensity("comfortable")).toBe("comfortable");
  });
  it("scales the whole panel from one value", () => {
    expect(SCALING).toEqual({ compact: "90%", comfortable: "100%" });
    expect(isDensity("compact")).toBe(true);
    expect(isDensity(5)).toBe(false);
  });
});
