import { describe, expect, it } from "vitest";
import { anchorFromPayload } from "./anchor";

describe("anchorFromPayload", () => {
  it("accepts an edge and an offset", () => {
    expect(anchorFromPayload({ edge: "bottom", offset: 280 })).toEqual({ edge: "bottom", offset: 280 });
    expect(anchorFromPayload({ edge: "top", offset: -12 })).toEqual({ edge: "top", offset: -12 });
  });

  it("ignores anything else, so a bad message can never break the layout", () => {
    for (const bad of [null, "bottom", { edge: "left", offset: 1 }, { edge: "top" }, { edge: "top", offset: "5" }, { edge: "top", offset: Number.NaN }]) {
      expect(anchorFromPayload(bad)).toBeNull();
    }
  });
});
