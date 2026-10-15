import { describe, expect, it } from "vitest";
import { DEFAULT_POMODORO_CONFIG, beginPhase, describePomodoro, endPhase, isPhaseDue, nextPhase, pausePomodoro, remainingMs, resumePomodoro, startPomodoro } from "./pomodoro";

const MIN = 60_000;
const cfg = DEFAULT_POMODORO_CONFIG;
const T0 = 1_000_000;

describe("a cycle", () => {
  it("starts with work 1 of 4 for 25 minutes and is due when they are up", () => {
    const s = startPomodoro(cfg, T0, "Invoice", "t1");
    expect(s).toMatchObject({ cycle: 1, phase: "work", phaseMin: 25, waiting: false });
    expect(remainingMs(s, T0 + 10 * MIN)).toBe(15 * MIN);
    expect(isPhaseDue(s, T0 + 24 * MIN)).toBe(false);
    expect(isPhaseDue(s, T0 + 25 * MIN)).toBe(true);
  });

  it("goes work → short break → work (next cycle), and a long break after the fourth work", () => {
    let s = startPomodoro(cfg, T0, "x", null);
    expect(nextPhase(s, cfg)).toBe("short");
    s = beginPhase(s, "short", cfg, T0);
    expect(s).toMatchObject({ cycle: 1, phase: "short", phaseMin: 5 });
    s = beginPhase(s, "work", cfg, T0);
    expect(s.cycle).toBe(2);
    s = { ...s, cycle: 4 };
    expect(nextPhase(s, cfg)).toBe("long");
    expect(beginPhase(s, "long", cfg, T0).phaseMin).toBe(15);
  });

  it("waits for the person at the end of a phase unless auto-start is on", () => {
    const s = startPomodoro(cfg, T0, "x", null);
    const waiting = endPhase(s, cfg, T0 + 25 * MIN);
    expect(waiting.waiting).toBe(true);
    expect(remainingMs(waiting, T0 + 30 * MIN)).toBe(0);
    const auto = endPhase(s, { ...cfg, autoStart: true }, T0 + 25 * MIN);
    expect(auto).toMatchObject({ phase: "short", waiting: false, phaseStartedAt: T0 + 25 * MIN });
  });

  it("pauses with the remaining time and resumes from there", () => {
    const s = startPomodoro(cfg, T0, "x", null);
    const paused = pausePomodoro(s, T0 + 10 * MIN);
    expect(remainingMs(paused, T0 + 60 * MIN)).toBe(15 * MIN);
    const resumed = resumePomodoro(paused, T0 + 60 * MIN);
    expect(remainingMs(resumed, T0 + 60 * MIN)).toBe(15 * MIN);
    expect(isPhaseDue(resumed, T0 + 75 * MIN)).toBe(true);
  });

  it("describes itself in plain words", () => {
    const s = startPomodoro(cfg, T0, "x", null);
    expect(describePomodoro(s, cfg, T0 + 8 * MIN)).toEqual({ title: "Work 1 of 4", detail: "17 min left" });
    expect(describePomodoro(endPhase(s, cfg, T0 + 25 * MIN), cfg, T0 + 25 * MIN)).toEqual({ title: "Work 1 of 4", detail: "done" });
    expect(describePomodoro(beginPhase(s, "short", cfg, T0), cfg, T0).title).toBe("Break");
  });
});
