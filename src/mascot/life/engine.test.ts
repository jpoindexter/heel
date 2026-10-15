import { describe, expect, it } from "vitest";
import { MAX_PER_HOUR, SLEEP_AFTER_MS } from "./config";
import { decide, initialState, interact, planDuration, type Context, type LifeState, type Plan } from "./engine";
import { isMotionId } from "../sheets";

/** A deterministic dice: the same seed gives the same rolls. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const MIN = 60_000;
const ctx = (over: Partial<Context> = {}): Context => ({ now: 0, activity: "calm", panelOpen: false, focusActive: false, reducedMotion: false, canWalk: true, ...over });
const idleFor = (ms: number, state: LifeState): LifeState => ({ ...state, lastActiveAt: -ms, nextAt: 0 });

describe("quiet guards: nothing happens", () => {
  const base = initialState(0, "calm", seeded(1));
  const due = { ...base, nextAt: 0 };

  it.each([
    ["activity is off", { activity: "off" as const }],
    ["the panel is open", { panelOpen: true }],
    ["a focus time-box is running", { focusActive: true }],
    ["reduced motion is on", { reducedMotion: true }],
  ])("when %s", (_name, over) => {
    const result = decide(due, ctx({ now: 5 * MIN, ...over }), seeded(2));
    expect(result.plan).toBeNull();
    expect(result.state.sleeping).toBe(false);
  });

  it("does not act before the person's quiet stretch is over", () => {
    const fresh = interact(base, 0, "calm", seeded(3));
    expect(decide(fresh, ctx({ now: 30_000 }), seeded(4)).plan).toBeNull();
  });
});

describe("behaviours", () => {
  it("only ever uses animations that exist, and every finite step has a length", () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const rng = seeded(seed);
      const state = initialState(0, "lively", rng);
      const plan = decide({ ...state, nextAt: 0 }, ctx({ now: 1 * MIN, activity: "lively" }), rng).plan;
      expect(plan, `seed ${seed}`).not.toBeNull();
      for (const step of plan!.steps) {
        expect(isMotionId(step.motion), step.motion).toBe(true);
        expect(step.ms).toBeGreaterThan(0);
      }
    }
  });

  it("does not repeat the same behaviour twice in a row", () => {
    const rng = seeded(7);
    let state = initialState(0, "lively", rng);
    let last: string | null = null;
    for (let t = 1; t <= 30; t += 1) {
      const result = decide({ ...state, nextAt: 0 }, ctx({ now: t * 20_000, activity: "lively", canWalk: true }), rng);
      state = result.state;
      if (result.plan) {
        expect(result.plan.behavior).not.toBe(last);
        last = result.plan.behavior;
      }
    }
  });

  it("never walks until walking is available", () => {
    const rng = seeded(11);
    for (let i = 0; i < 400; i += 1) {
      const state = { ...initialState(0, "lively", rng), nextAt: 0 };
      const plan = decide(state, ctx({ now: MIN, activity: "lively", canWalk: false }), rng).plan;
      expect(plan?.behavior).not.toBe("walk");
    }
  });

  it("a walk starts with a gentle lead-in and says which way", () => {
    const rng = seeded(3);
    let walk: Plan | null = null;
    for (let i = 0; i < 400 && !walk; i += 1) {
      const state = { ...initialState(0, "lively", rng), nextAt: 0 };
      const plan = decide(state, ctx({ now: MIN, activity: "lively" }), rng).plan;
      if (plan?.behavior === "walk") walk = plan;
    }
    expect(walk).not.toBeNull();
    expect(walk!.steps[0]!.motion).toBe("smooth:listening");
    expect(["left", "right"]).toContain(walk!.walk!.direction);
  });
});

describe("sleep", () => {
  it("lies down and sleeps after a long idle, holding the last step until the person returns", () => {
    const rng = seeded(5);
    const state = idleFor(SLEEP_AFTER_MS.calm, initialState(0, "calm", rng));
    const { state: next, plan } = decide(state, ctx({ now: 0 }), rng);
    expect(plan?.behavior).toBe("sleep");
    expect(plan!.steps.at(-1)).toEqual({ motion: "smooth:rest", ms: Infinity });
    expect(next.sleeping).toBe(true);
    expect(decide(next, ctx({ now: 99 * MIN }), rng).plan).toBeNull();
  });

  it("wakes on any interaction and starts a fresh quiet stretch", () => {
    const rng = seeded(6);
    const asleep: LifeState = { lastActiveAt: -SLEEP_AFTER_MS.calm, nextAt: Infinity, sleeping: true, lastBehavior: "sleep" };
    const awake = interact(asleep, 1_000, "calm", rng);
    expect(awake.sleeping).toBe(false);
    expect(awake.nextAt).toBeGreaterThanOrEqual(1_000 + 60_000);
    expect(decide(awake, ctx({ now: 2_000 }), rng).plan).toBeNull();
  });

  it("sleeps sooner when lively", () => {
    expect(SLEEP_AFTER_MS.lively).toBeLessThan(SLEEP_AFTER_MS.calm);
  });
});

describe("cadence", () => {
  it.each(["calm", "lively"] as const)("%s: an hour of idleness stays under the frequency cap and leaves gaps", (activity) => {
    const rng = seeded(42);
    let state = initialState(0, activity, rng);
    let count = 0;
    let busyMs = 0;
    for (let now = 0; now <= 60 * MIN; now += 1_000) {
      // The person never touches anything, but sleep is out of scope for this test.
      state = { ...state, lastActiveAt: now };
      const result = decide(state, ctx({ now, activity }), rng);
      state = result.state;
      if (result.plan) {
        count += 1;
        busyMs += planDuration(result.plan);
      }
    }
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(MAX_PER_HOUR[activity]);
    expect(busyMs / (60 * MIN)).toBeLessThan(0.5);
  });
});
