import { describe, expect, it } from "vitest";
import { INITIAL_ATTENTION, SNOOZE_MS, decideAttention, type AttentionContext, type AttentionState, type Sample } from "./attention";

const MIN = 60_000;
const T0 = 10_000_000;
const safari = (at: number, idleSec = 1): Sample => ({ at, bundle: "com.apple.Safari", name: "Safari", idleSec });
const code = (at: number, idleSec = 1): Sample => ({ at, bundle: "com.microsoft.VSCode", name: "Code", idleSec });
const ctx = (over: Partial<AttentionContext> = {}): AttentionContext => ({ now: T0, box: null, quiet: false, nowTask: "Pay the invoice", wanderBundles: ["com.apple.Safari"], ...over });
const box = { goal: "Pay the invoice", startedAt: T0, realisticMin: 25, worstMin: 38 };

function run(samples: Sample[], context: AttentionContext, start: AttentionState = INITIAL_ATTENTION) {
  let state = start;
  const nudges = [];
  for (const sample of samples) {
    const result = decideAttention(state, sample, { ...context, now: sample.at });
    state = result.state;
    if (result.nudge) nudges.push(result.nudge);
  }
  return { state, nudges };
}

describe("rabbit hole", () => {
  it("speaks once after a wander app has held the front for half the box, and not again within the snooze", () => {
    const samples = Array.from({ length: 12 }, (_, i) => safari(T0 + i * 2 * MIN));
    const { nudges } = run(samples, ctx({ box }));
    expect(nudges.map((n) => n.rule)).toEqual(["rabbit-hole"]);
    expect(nudges[0]?.text).toContain("Safari");
    expect(nudges[0]?.choices).toEqual(["Back to it", "Park it", "Not now"]);
  });
  it("says nothing for a work app, or with no box running", () => {
    const samples = Array.from({ length: 12 }, (_, i) => code(T0 + i * 2 * MIN));
    expect(run(samples, ctx({ box })).nudges).toEqual([]);
    expect(run(Array.from({ length: 12 }, (_, i) => safari(T0 + i * 2 * MIN)), ctx()).nudges).toEqual([]);
  });
});

describe("time suck", () => {
  it("speaks after twelve switches in five minutes with no box, then holds its tongue", () => {
    const samples = Array.from({ length: 30 }, (_, i) => (i % 2 ? safari(T0 + i * 10_000) : code(T0 + i * 10_000)));
    const { nudges } = run(samples, ctx());
    expect(nudges.map((n) => n.rule)).toEqual(["time-suck"]);
    expect(nudges[0]?.choices[0]).toBe("Start: Pay the invoice");
  });
});

describe("drifting", () => {
  it("speaks when the person comes back after a long idle, not during it", () => {
    const away = Array.from({ length: 5 }, (_, i) => code(T0 + i * MIN, 20 * 60 + i * 60));
    const back = code(T0 + 6 * MIN, 2);
    const { nudges } = run([...away, back], ctx());
    expect(nudges.map((n) => n.rule)).toEqual(["drifting"]);
    expect(nudges[0]?.text).toContain("Pay the invoice");
  });
});

describe("hyperfocus and quiet", () => {
  it("speaks when a box runs past its worst case", () => {
    const late = code(T0 + 49 * MIN);
    expect(run([late], ctx({ box })).nudges.map((n) => n.rule)).toEqual(["hyperfocus"]);
  });
  it("says nothing at all in Quiet mode, but keeps counting", () => {
    const samples = Array.from({ length: 12 }, (_, i) => safari(T0 + i * 2 * MIN));
    const { nudges, state } = run(samples, ctx({ box, quiet: true }));
    expect(nudges).toEqual([]);
    expect(state.app?.bundle).toBe("com.apple.Safari");
  });
  it("respects the snooze across rules independently", () => {
    const spoke: AttentionState = { ...INITIAL_ATTENTION, spokeAt: { "rabbit-hole": T0 - SNOOZE_MS + MIN } };
    const samples = Array.from({ length: 12 }, (_, i) => safari(T0 + i * 2 * MIN));
    const { nudges } = run(samples, ctx({ box }), spoke);
    expect(nudges.map((n) => n.rule)).toEqual(["rabbit-hole"]);
    expect(nudges.length).toBe(1);
  });
});
