import { describe, expect, it } from "vitest";
import type { FocusDto } from "../../shared/api";
import { decidePresence, type PresenceMemory } from "./presence";

const START = 1_000_000;
const focus: FocusDto = { id: "f1", goal: "Write", taskId: null, bestMin: 18, realisticMin: 25, worstMin: 38, startedAt: START, endedAt: null, outcome: null };
const RUNNING = START + 5 * 60_000;
const DUE = START + 25 * 60_000;
const fresh: PresenceMemory = { posed: false, nudgedFor: null };

describe("decidePresence", () => {
  it("shows the focus pose once while a box runs, then leaves him alone", () => {
    expect(decidePresence({ focus, now: RUNNING, activity: "calm", memory: fresh })).toEqual({ kind: "pose" });
    expect(decidePresence({ focus, now: RUNNING, activity: "calm", memory: { posed: true, nudgedFor: null } })).toEqual({ kind: "none" });
  });

  it("nudges once at the realistic end, under a reason tied to that box", () => {
    expect(decidePresence({ focus, now: DUE, activity: "calm", memory: { posed: true, nudgedFor: null } })).toEqual({ kind: "nudge", reason: "focus-end:f1" });
    expect(decidePresence({ focus, now: DUE + 60_000, activity: "calm", memory: { posed: true, nudgedFor: "f1" } })).toEqual({ kind: "none" });
  });

  it("nudges again for a new box", () => {
    const next = { ...focus, id: "f2" };
    expect(decidePresence({ focus: next, now: DUE, activity: "lively", memory: { posed: false, nudgedFor: "f1" } })).toEqual({ kind: "nudge", reason: "focus-end:f2" });
  });

  it("goes back to rest when the box is over", () => {
    expect(decidePresence({ focus: null, now: DUE, activity: "calm", memory: { posed: true, nudgedFor: "f1" } })).toEqual({ kind: "rest" });
    expect(decidePresence({ focus: null, now: DUE, activity: "calm", memory: fresh })).toEqual({ kind: "none" });
  });

  it("does nothing at all in Off mode, except putting the pose away", () => {
    expect(decidePresence({ focus, now: DUE, activity: "off", memory: fresh })).toEqual({ kind: "none" });
    expect(decidePresence({ focus, now: RUNNING, activity: "off", memory: fresh })).toEqual({ kind: "none" });
    expect(decidePresence({ focus, now: RUNNING, activity: "off", memory: { posed: true, nudgedFor: null } })).toEqual({ kind: "rest" });
  });
});
