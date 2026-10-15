import { describe, expect, it } from "vitest";
import { fadeFromPayload } from "./fade";

describe("fadeFromPayload", () => {
  it("accepts an opacity between 0 and 1 and a duration", () => {
    expect(fadeFromPayload({ opacity: 0, ms: 200 })).toEqual({ opacity: 0, ms: 200 });
    expect(fadeFromPayload({ opacity: 1, ms: 0 })).toEqual({ opacity: 1, ms: 0 });
  });

  it("ignores anything else, so a bad message can never leave him invisible", () => {
    for (const bad of [null, "0", { opacity: 2, ms: 1 }, { opacity: -1, ms: 1 }, { opacity: 0 }, { opacity: 0, ms: -5 }]) {
      expect(fadeFromPayload(bad)).toBeNull();
    }
  });
});
