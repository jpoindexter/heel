import { describe, expect, it } from "vitest";
import { applyWork, isWorking, nextPaceLeg, WorkPayloadSchema, workVisual } from "./work";

describe("applyWork", () => {
  it("is one state however many flights are up, and ends only when the last one lands", () => {
    let set = applyWork(new Set(), { id: "turn-1", active: true });
    set = applyWork(set, { id: "digest-1", active: true });
    expect(isWorking(set)).toBe(true);
    set = applyWork(set, { id: "turn-1", active: false });
    expect(isWorking(set)).toBe(true);
    set = applyWork(set, { id: "digest-1", active: false });
    expect(isWorking(set)).toBe(false);
  });
  it("ignores an end for a flight it never saw", () => {
    expect(isWorking(applyWork(new Set(), { id: "ghost", active: false }))).toBe(false);
  });
  it("rejects a payload without an id", () => {
    expect(WorkPayloadSchema.safeParse({ id: "", active: true }).success).toBe(false);
  });
});

describe("workVisual", () => {
  const base = { working: true, panelOpen: false, reducedMotion: false, quiet: false };
  it("shows nothing when nothing is in flight", () => {
    expect(workVisual({ ...base, working: false })).toEqual({ bubble: false, move: "none" });
  });
  it("paces with the bubble when the panel is closed", () => {
    expect(workVisual(base)).toEqual({ bubble: true, move: "pace" });
  });
  it("sways in place when the panel is docked to him", () => {
    expect(workVisual({ ...base, panelOpen: true })).toEqual({ bubble: true, move: "sway" });
  });
  it("is bubble only under reduced motion or Quiet mode", () => {
    expect(workVisual({ ...base, reducedMotion: true })).toEqual({ bubble: true, move: "none" });
    expect(workVisual({ ...base, quiet: true, panelOpen: true })).toEqual({ bubble: true, move: "none" });
  });
});

describe("nextPaceLeg", () => {
  it("alternates, starting left", () => {
    expect(nextPaceLeg(null)).toBe("left");
    expect(nextPaceLeg("left")).toBe("right");
    expect(nextPaceLeg("right")).toBe("left");
  });
});
