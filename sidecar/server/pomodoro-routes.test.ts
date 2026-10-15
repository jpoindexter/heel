import { describe, expect, it } from "vitest";
import { FocusStateSchema, PomodoroViewSchema, envelope } from "../../shared/api";
import { testStore } from "../store/test-helpers";
import { setup } from "./test-app";

const view = envelope(PomodoroViewSchema);
const MIN = 60_000;

/** A clock the test moves by hand. */
function clockSetup() {
  let now = 1_000_000;
  const app = setup({}, {}, undefined, testStore({ now: () => now }));
  return { ...app, advance: (ms: number) => (now += ms) };
}

describe("Pomodoro", () => {
  it("starts work 1 of 4, counts down, and waits at the end until the person goes on", async () => {
    const { json, post, advance } = clockSetup();
    const started = view.parse(await post("/pomodoro/start", { goal: "Invoice", taskId: null }));
    expect(started).toMatchObject({ ok: true, data: { state: { phase: "work", cycle: 1 }, remainingMs: 25 * MIN, ended: null } });
    advance(25 * MIN);
    const due = view.parse(await json("/pomodoro"));
    expect(due).toMatchObject({ ok: true, data: { state: { phase: "work", waiting: true }, ended: "work" } });
    expect(view.parse(await json("/pomodoro"))).toMatchObject({ data: { ended: null } });
    const next = view.parse(await post("/pomodoro/next"));
    expect(next).toMatchObject({ ok: true, data: { state: { phase: "short", cycle: 1, waiting: false }, remainingMs: 5 * MIN } });
  });

  it("shows a running work phase as the active focus for the guards, and nothing during a break", async () => {
    const { json, post, advance } = clockSetup();
    await post("/pomodoro/start", { goal: "Invoice", taskId: null });
    const focus = envelope(FocusStateSchema).parse(await json("/focus"));
    expect(focus).toMatchObject({ ok: true, data: { focus: { id: "pomodoro", goal: "Invoice", realisticMin: 25 } } });
    advance(25 * MIN);
    await json("/pomodoro");
    await post("/pomodoro/next");
    expect(envelope(FocusStateSchema).parse(await json("/focus"))).toMatchObject({ data: { focus: null } });
  });

  it("pauses, resumes, skips and stops", async () => {
    const { json, post, advance } = clockSetup();
    await post("/pomodoro/start", { goal: "x", taskId: null });
    advance(5 * MIN);
    expect(view.parse(await post("/pomodoro/pause"))).toMatchObject({ data: { remainingMs: 20 * MIN } });
    advance(60 * MIN);
    expect(view.parse(await post("/pomodoro/resume"))).toMatchObject({ data: { remainingMs: 20 * MIN } });
    expect(view.parse(await post("/pomodoro/skip"))).toMatchObject({ data: { state: { waiting: true } } });
    expect(view.parse(await post("/pomodoro/stop"))).toMatchObject({ data: { state: null } });
    expect(view.parse(await json("/pomodoro"))).toMatchObject({ data: { state: null } });
    expect(view.parse(await post("/pomodoro/pause"))).toMatchObject({ ok: false });
  });

  it("keeps the lengths in Settings and uses them for the next phases", async () => {
    const { json, post, send } = clockSetup();
    expect(view.parse(await json("/pomodoro"))).toMatchObject({ data: { config: { workMin: 25 } } });
    const saved = await send("PUT", "/pomodoro/config", { workMin: 50, shortMin: 10, longMin: 20, cycles: 2, autoStart: true });
    expect(saved).toMatchObject({ ok: true, data: { workMin: 50, autoStart: true } });
    expect(await send("PUT", "/pomodoro/config", { workMin: 0 })).toMatchObject({ ok: false });
    expect(view.parse(await post("/pomodoro/start", { goal: "x" }))).toMatchObject({ data: { remainingMs: 50 * MIN } });
  });
});
