import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { DEFAULT_METHOD_NUMBERS } from "../../shared/method";
import { hoursText, jarFor } from "./jar-model";

const task = (bucket: string | null, size: TaskDto["size"] = null): TaskDto => ({
  id: `${bucket}-${size}-${Math.random()}`,
  title: "t",
  status: "todo",
  nowStep: null,
  source: "manual",
  sourceRef: null,
  position: 0,
  createdAt: 0,
  updatedAt: 0,
  completedAt: null,
  size,
  bucket,
  estimateMin: null,
});

describe("hoursText", () => {
  it("says minutes under an hour, whole hours plainly, and hours with minutes", () => {
    expect([45, 60, 240, 195].map(hoursText)).toEqual(["45 min", "1 h", "4 h", "3 h 15"]);
  });
});

describe("jarFor", () => {
  it("counts the buckets and is not full with a normal day", () => {
    const jar = jarFor([task("rock"), task("pebble"), task("pebble"), task("sand"), task(null)], DEFAULT_METHOD_NUMBERS, "none");
    expect(jar).toMatchObject({ rocks: 1, pebbles: 2, sand: 1, minutes: null, full: false, line: "1 rock, 2 pebbles" });
  });
  it("is full with more rocks than the day holds", () => {
    expect(jarFor([task("rock"), task("rock"), task("rock")], DEFAULT_METHOD_NUMBERS, "none").full).toBe(true);
  });
  it("adds the sizes up against the capacity when sizing is on", () => {
    const jar = jarFor([task("rock", "l"), task("pebble", "m"), task("sand", "xl")], DEFAULT_METHOD_NUMBERS, "tshirt");
    expect(jar.minutes).toBe(170);
    expect(jar.full).toBe(false);
    expect(jar.line).toBe("1 rock, 1 pebble · about 2 h 50 of 4 h");
    expect(jarFor([task("rock", "xl"), task("pebble", "xl")], DEFAULT_METHOD_NUMBERS, "tshirt").full).toBe(true);
  });
  it("falls back to counting when nothing is sized yet", () => {
    const seven = Array.from({ length: 7 }, (_, i) => task(i < 2 ? "rock" : "pebble"));
    expect(jarFor(seven, DEFAULT_METHOD_NUMBERS, "tshirt")).toMatchObject({ minutes: null, full: true });
  });
});
