import { describe, expect, it } from "vitest";
import { AttentionViewSchema, NudgeResultSchema, envelope } from "../../shared/api";
import { testStore } from "../store/test-helpers";
import { setup } from "./test-app";

const view = envelope(AttentionViewSchema);
const nudge = envelope(NudgeResultSchema);
const MIN = 60_000;

function clockSetup() {
  let now = new Date(2026, 9, 15, 10, 0, 0).getTime();
  const app = setup({}, {}, undefined, testStore({ now: () => now }));
  return { ...app, advance: (ms: number) => (now += ms), at: () => now };
}

const safari = (at: number, idleSec = 1) => ({ bundle: "com.apple.Safari", name: "Safari", idleSec, intervalSec: 5, quiet: false, at });

describe("attention", () => {
  it("is off by default and folds nothing while off", async () => {
    const { json, post } = clockSetup();
    expect(view.parse(await json("/attention"))).toMatchObject({ ok: true, data: { settings: { enabled: false }, day: { apps: {} } } });
    expect(nudge.parse(await post("/attention/sample", safari(Date.now())))).toMatchObject({ ok: true, data: { nudge: null } });
    expect(view.parse(await json("/attention"))).toMatchObject({ data: { day: { apps: {} } } });
  });

  it("keeps the day's seconds per app once on, and nudges about a rabbit hole during a box, once", async () => {
    const { json, post, send, at, store } = clockSetup();
    await send("PUT", "/attention/settings", { enabled: true, wanderBundles: ["com.apple.Safari"] });
    store.focus.start({ goal: "Invoice", taskId: null, bestMin: 18, realisticMin: 25, worstMin: 38 });
    const nudges = [];
    for (let i = 0; i < 12; i += 1) {
      const result = nudge.parse(await post("/attention/sample", safari(at() + i * 2 * MIN)));
      if (result.ok && result.data.nudge) nudges.push(result.data.nudge);
    }
    expect(nudges.map((n) => n.rule)).toEqual(["rabbit-hole"]);
    expect(nudges[0]?.choices).toEqual(["Back to it", "Park it", "Not now"]);
    const day = view.parse(await json("/attention"));
    expect(day).toMatchObject({ data: { day: { apps: { "com.apple.Safari": { name: "Safari", seconds: 60 } } } } });
  });

  it("stays silent when the interrupt budget is spent, and when the panel says quiet", async () => {
    const { post, send, at, store } = clockSetup();
    await send("PUT", "/attention/settings", { enabled: true, wanderBundles: ["com.apple.Safari"] });
    store.focus.start({ goal: "Invoice", taskId: null, bestMin: 18, realisticMin: 25, worstMin: 38 });
    for (const reason of ["a", "b", "c"]) store.interrupts.spend(reason);
    for (let i = 0; i < 12; i += 1) {
      const result = nudge.parse(await post("/attention/sample", safari(at() + i * 2 * MIN)));
      if (result.ok) expect(result.data.nudge).toBeNull();
    }
    const quietApp = clockSetup();
    await quietApp.send("PUT", "/attention/settings", { enabled: true, wanderBundles: ["com.apple.Safari"] });
    quietApp.store.focus.start({ goal: "Invoice", taskId: null, bestMin: 18, realisticMin: 25, worstMin: 38 });
    for (let i = 0; i < 12; i += 1) {
      const result = nudge.parse(await quietApp.post("/attention/sample", { ...safari(quietApp.at() + i * 2 * MIN), quiet: true }));
      if (result.ok) expect(result.data.nudge).toBeNull();
    }
  });

  it("rejects a sample without a bundle", async () => {
    expect(nudge.parse(await clockSetup().post("/attention/sample", { name: "x" }))).toMatchObject({ ok: false });
  });
});
