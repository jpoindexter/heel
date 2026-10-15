import { describe, expect, it } from "vitest";
import { MOTIONS } from "./config";
import { runFromPayload } from "./run-event";

describe("runFromPayload", () => {
  it("faces the way he is travelling and holds for the glide", () => {
    expect(runFromPayload({ direction: "left", duration_ms: 900 })).toEqual({ motion: MOTIONS.runLeft, ms: 900, arriving: false });
    expect(runFromPayload({ direction: "right", duration_ms: 400, arriving: true })).toEqual({ motion: MOTIONS.runRight, ms: 400, arriving: true });
  });

  it("ignores anything else", () => {
    for (const bad of [null, "left", { direction: "up", duration_ms: 5 }, { direction: "left" }, { direction: "left", duration_ms: -1 }]) {
      expect(runFromPayload(bad)).toBeNull();
    }
  });
});
