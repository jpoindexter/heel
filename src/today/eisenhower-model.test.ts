import { describe, expect, it } from "vitest";
import { dropsOnBucket } from "./eisenhower-model";

describe("dropsOnBucket", () => {
  it("is true only for Eisenhower's Drop", () => {
    expect(dropsOnBucket("eisenhower", "drop")).toBe(true);
    expect(dropsOnBucket("eisenhower", "delegate")).toBe(false);
    expect(dropsOnBucket("eisenhower", null)).toBe(false);
    expect(dropsOnBucket("pickle-jar", "drop")).toBe(false);
  });
});
