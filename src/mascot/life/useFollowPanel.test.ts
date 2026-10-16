import { describe, expect, it } from "vitest";
import { followLeg } from "./useFollowPanel";

describe("following the parked panel", () => {
  it("walks toward a panel a stride away, stopping short, and stays for a near or docked one", () => {
    expect(followLeg(500)).toEqual({ direction: "right", distancePx: 340 });
    expect(followLeg(-320)).toEqual({ direction: "left", distancePx: 160 });
    expect(followLeg(120)).toBeNull();
    expect(followLeg(null)).toBeNull();
  });
});
