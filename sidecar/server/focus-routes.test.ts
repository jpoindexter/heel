import { describe, expect, it } from "vitest";
import { FocusStateSchema, InterruptStateSchema, SpendResultSchema, envelope } from "../../shared/api";
import { setup } from "./test-app";

const focusState = envelope(FocusStateSchema);
const spendResult = envelope(SpendResultSchema);
const interruptState = envelope(InterruptStateSchema);

describe("focus routes", () => {
  it("starts a box with a range made from one guess, and reports it as the active one", async () => {
    const { post, json } = setup();
    expect(focusState.parse(await json("/focus"))).toEqual({ ok: true, data: { focus: null } });
    const started = focusState.parse(await post("/focus/start", { goal: "Write the intro", realisticMin: 25 }));
    expect(started).toMatchObject({ ok: true, data: { focus: { goal: "Write the intro", bestMin: 18, realisticMin: 25, worstMin: 38, endedAt: null } } });
    expect(focusState.parse(await json("/focus"))).toMatchObject({ data: { focus: { goal: "Write the intro" } } });
  });

  it("keeps the goal exactly as typed so the check-in can quote it", async () => {
    const { post } = setup();
    const started = focusState.parse(await post("/focus/start", { goal: "  Fix the “login” bug  ", realisticMin: 15 }));
    expect(started).toMatchObject({ ok: true, data: { focus: { goal: "Fix the “login” bug" } } });
  });

  it("refuses a second box while one runs, and an empty goal", async () => {
    const { post } = setup();
    await post("/focus/start", { goal: "A", realisticMin: 15 });
    expect(await post("/focus/start", { goal: "B", realisticMin: 15 })).toMatchObject({ ok: false, error: { code: "conflict" } });
    expect(await setup().post("/focus/start", { goal: " ", realisticMin: 15 })).toMatchObject({ ok: false });
  });

  it("ends a box with an outcome, after which none is active", async () => {
    const { post, json } = setup();
    const started = focusState.parse(await post("/focus/start", { goal: "A", realisticMin: 15 }));
    if (!started.ok || !started.data.focus) throw new Error("setup");
    expect(await post(`/focus/${started.data.focus.id}/end`, { outcome: "done" })).toMatchObject({ ok: true, data: { focus: { outcome: "done" } } });
    expect(focusState.parse(await json("/focus"))).toEqual({ ok: true, data: { focus: null } });
  });

  it("rejects an outcome it does not know", async () => {
    expect(await setup().post("/focus/x/end", { outcome: "gave-up" })).toMatchObject({ ok: false, error: { code: "invalid" } });
  });
});

describe("interrupt routes", () => {
  it("spends once per reason and reports what is left", async () => {
    const { post, json } = setup();
    expect(spendResult.parse(await post("/interrupts/spend", { reason: "focus-end:a" }))).toEqual({ ok: true, data: { allowed: true, remaining: 2, why: "spent" } });
    expect(spendResult.parse(await post("/interrupts/spend", { reason: "focus-end:a" }))).toMatchObject({ data: { allowed: false, why: "already" } });
    expect(interruptState.parse(await json("/interrupts"))).toEqual({ ok: true, data: { limit: 3, used: 1, remaining: 2 } });
  });
});
