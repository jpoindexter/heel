import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { DEFAULT_ATTENTION_SETTINGS } from "../../shared/api";
import { testStore } from "./test-helpers";

/** 09:00 local on a weekday: every sample of one run falls inside one clock hour (the budget reason is per hour). */
const T0 = new Date(2026, 0, 5, 9, 0, 0).getTime();
const STEP_MS = 10_000;
const INTERVAL_SEC = 10;
const context = { box: null, quiet: false, nowTask: "Pay the invoice", wanderBundles: ["com.apple.Safari"] };
const sample = (i: number) => ({
  at: T0 + i * STEP_MS,
  bundle: i % 2 ? "com.apple.Safari" : "com.microsoft.VSCode",
  name: i % 2 ? "Safari" : "Code",
  idleSec: 1,
  intervalSec: INTERVAL_SEC,
});

/** Thirty samples alternating between two apps every 10 s: the "time suck" rule (12 switches in 5 min). */
function timeSuck(store: ReturnType<typeof testStore>) {
  const nudges = [];
  for (let i = 0; i < 30; i += 1) {
    const nudge = store.attention.fold(sample(i), context);
    if (nudge) nudges.push(nudge);
  }
  return nudges;
}

describe("foldAttention", () => {
  it("does nothing at all while the sensor is off: no nudge, no seconds kept", () => {
    const store = testStore();
    expect(timeSuck(store)).toEqual([]);
    expect(store.attention.day().apps).toEqual({});
    expect(store.interrupts.state().used).toBe(0);
    store.close();
  });

  it("keeps today's seconds per app and speaks once, spending one interrupt with a per-hour reason", () => {
    const store = testStore();
    store.settings.setAttention({ ...DEFAULT_ATTENTION_SETTINGS, enabled: true, wanderBundles: ["com.apple.Safari"] });
    const nudges = timeSuck(store);
    expect(nudges.map((n) => n.rule)).toEqual(["time-suck"]);
    expect(store.interrupts.state().used).toBe(1);
    const day = store.attention.day();
    expect(day.apps["com.apple.Safari"]?.seconds).toBe(15 * INTERVAL_SEC);
    expect(day.apps["com.microsoft.VSCode"]?.seconds).toBe(15 * INTERVAL_SEC);
    store.close();
  });

  it("never spends the budget twice for the same rule in the same hour, even after the snooze", () => {
    const store = testStore();
    store.settings.setAttention({ ...DEFAULT_ATTENTION_SETTINGS, enabled: true, wanderBundles: ["com.apple.Safari"] });
    expect(timeSuck(store)).toHaveLength(1);
    // The same pattern again, 31 minutes later (past SNOOZE_MS) but inside the same clock hour.
    const later = 31 * 60_000;
    const again = [];
    for (let i = 0; i < 30; i += 1) {
      const s = sample(i);
      const nudge = store.attention.fold({ ...s, at: s.at + later }, context);
      if (nudge) again.push(nudge);
    }
    expect(again).toEqual([]);
    expect(store.interrupts.state().used).toBe(1);
    // In the next clock hour the reason is new, so the rule may speak again (and spends a second interrupt).
    const nextHour = 61 * 60_000;
    const later2 = [];
    for (let i = 0; i < 30; i += 1) {
      const s = sample(i);
      const nudge = store.attention.fold({ ...s, at: s.at + nextHour }, context);
      if (nudge) later2.push(nudge);
    }
    expect(later2.map((n) => n.rule)).toEqual(["time-suck"]);
    expect(store.interrupts.state().used).toBe(2);
    store.close();
  });

  it("stays silent when the budget is already spent, and keeps the rule free to speak later", () => {
    const store = testStore();
    store.settings.setAttention({ ...DEFAULT_ATTENTION_SETTINGS, enabled: true, wanderBundles: ["com.apple.Safari"] });
    for (const reason of ["a", "b", "c"]) store.interrupts.spend(reason);
    expect(store.interrupts.state().remaining).toBe(0);
    expect(timeSuck(store)).toEqual([]);
    expect(store.interrupts.state().used).toBe(3);
    store.close();
  });

  it("treats a drift-state row of another shape as a fresh start instead of failing every sample", () => {
    const path = join(mkdtempSync(join(tmpdir(), "heel-attention-")), "heel.db");
    const store = testStore({ path });
    store.settings.setAttention({ ...DEFAULT_ATTENTION_SETTINGS, enabled: true });
    const raw = new DatabaseSync(path);
    raw.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('attention-state', '{}', 0)").run();
    raw.close();
    expect(store.attention.fold(sample(0), context)).toBeNull();
    expect(timeSuck(store).map((n) => n.rule)).toEqual(["time-suck"]);
    store.close();
  });

  it("turning the sensor off forgets the drift state", () => {
    const store = testStore();
    store.settings.setAttention({ ...DEFAULT_ATTENTION_SETTINGS, enabled: true });
    for (let i = 0; i < 5; i += 1) store.attention.fold(sample(i), context);
    store.settings.setAttention({ ...DEFAULT_ATTENTION_SETTINGS, enabled: false });
    store.settings.setAttention({ ...DEFAULT_ATTENTION_SETTINGS, enabled: true, wanderBundles: ["com.apple.Safari"] });
    // A fresh state needs the full twelve switches again before it speaks.
    const nudges = [];
    for (let i = 0; i < 6; i += 1) {
      const nudge = store.attention.fold(sample(i), context);
      if (nudge) nudges.push(nudge);
    }
    expect(nudges).toEqual([]);
    store.close();
  });
});
