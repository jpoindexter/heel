import { describe, expect, it } from "vitest";
import { COME_BOTTOM_PX, GAZE_EYE, GAZE_RANGE_PX, GLANCE_HOLD_MS, GLANCE_REST_MS, LONG_IDLE_MS, REST_MS } from "./config";
import { GLANCE_START, comeTarget, gazeMotion, glance, lookIndex, pointerFromPayload, rest, returnedAfterIdle, type PointerSample } from "./pointer";

const at = (x: number, y: number, bottom = 900): PointerSample => ({ x, y, bottom });

describe("gaze", () => {
  it("names the sixteen looks clockwise from straight up", () => {
    expect(lookIndex(0, -10)).toBe(0);
    expect(lookIndex(10, -10)).toBe(2);
    expect(lookIndex(10, 0)).toBe(4);
    expect(lookIndex(0, 10)).toBe(8);
    expect(lookIndex(-10, 0)).toBe(12);
    expect(lookIndex(-10, -10)).toBe(14);
    expect(lookIndex(-1, -10)).toBe(0);
  });

  it("looks toward a near pointer and not at a far one", () => {
    expect(gazeMotion(at(GAZE_EYE.x + 200, GAZE_EYE.y))).toBe("puppy:look-directions#4");
    expect(gazeMotion(at(GAZE_EYE.x - 200, GAZE_EYE.y - 200))).toBe("puppy:look-directions#14");
    expect(gazeMotion(at(GAZE_EYE.x + GAZE_RANGE_PX + 1, GAZE_EYE.y))).toBeNull();
  });

  it("rejects a bad sample", () => {
    expect(pointerFromPayload({ x: 1, y: 2, bottom: 3 })).toEqual({ x: 1, y: 2, bottom: 3 });
    for (const bad of [null, {}, { x: 1, y: 2 }, { x: "1", y: 2, bottom: 3 }, { x: Number.NaN, y: 2, bottom: 3 }]) expect(pointerFromPayload(bad)).toBeNull();
  });

  it("calm: a glance that ends after a while, then a rest before the next; lively: follows for as long as it is near", () => {
    const look = "puppy:look-directions#4";
    let s = glance(GLANCE_START, 0, look, "calm");
    expect(s.show).toBe(look);
    s = glance(s.state, GLANCE_HOLD_MS - 1, look, "calm");
    expect(s.show).toBe(look);
    s = glance(s.state, GLANCE_HOLD_MS, look, "calm");
    expect(s.show).toBeNull();
    s = glance(s.state, GLANCE_HOLD_MS + GLANCE_REST_MS - 1, look, "calm");
    expect(s.show).toBeNull();
    s = glance(s.state, GLANCE_HOLD_MS + GLANCE_REST_MS, look, "calm");
    expect(s.show).toBe(look);
    expect(glance(GLANCE_START, 0, look, "lively").show).toBe(look);
    expect(glance(glance(GLANCE_START, 0, look, "lively").state, 60_000, look, "lively").show).toBe(look);
    expect(glance(GLANCE_START, 0, look, "off").show).toBeNull();
    expect(glance(GLANCE_START, 0, null, "lively").show).toBeNull();
  });
});

describe("coming over", () => {
  it("notices a pointer at rest for a few seconds, once per rest", () => {
    let r = rest(null, at(500, 800), 0);
    expect(r.rested).toBe(false);
    r = rest(r.state, at(503, 802), REST_MS - 1);
    expect(r.rested).toBe(false);
    r = rest(r.state, at(503, 802), REST_MS);
    expect(r.rested).toBe(true);
    r = rest({ ...r.state, served: true }, at(503, 802), REST_MS + 5_000);
    expect(r.rested).toBe(false);
    r = rest(r.state, at(600, 802), REST_MS + 5_000);
    expect(r.rested).toBe(false);
    expect(r.state.since).toBe(REST_MS + 5_000);
  });

  it("walks toward a pointer resting low on the screen, a stride away, stopping short of it", () => {
    const low = 900 - COME_BOTTOM_PX + 10;
    expect(comeTarget(at(GAZE_EYE.x + 400, low))).toEqual({ direction: "right", distancePx: 280 });
    expect(comeTarget(at(GAZE_EYE.x - 400, low))).toEqual({ direction: "left", distancePx: 280 });
    expect(comeTarget(at(GAZE_EYE.x + 400, 300))).toBeNull();
    expect(comeTarget(at(GAZE_EYE.x + 100, low))).toBeNull();
    expect(comeTarget(at(GAZE_EYE.x + 2000, low))).toBeNull();
    expect(comeTarget(at(GAZE_EYE.x + 900, low))!.distancePx).toBe(560);
  });

  it("knows the first move after a long quiet stretch", () => {
    expect(returnedAfterIdle(0, LONG_IDLE_MS)).toBe(true);
    expect(returnedAfterIdle(0, LONG_IDLE_MS - 1)).toBe(false);
  });
});

describe("the morning", () => {
  it("earns one stretch at first sight, between five and eleven, once a day", async () => {
    const { morningFirstSight } = await import("./pointer");
    expect(morningFirstSight(8, "Thu", null)).toBe(true);
    expect(morningFirstSight(8, "Thu", "Thu")).toBe(false);
    expect(morningFirstSight(8, "Fri", "Thu")).toBe(true);
    expect(morningFirstSight(14, "Thu", null)).toBe(false);
    expect(morningFirstSight(4, "Thu", null)).toBe(false);
  });
});
