import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { DAILY_INTERRUPT_LIMIT } from "./interrupts";
import { openStore } from "./store";

const DAY = 24 * 60 * 60 * 1000;

function storeAt(start: number) {
  let now = start;
  const store = openStore({ now: () => now });
  return { store, advance: (ms: number) => (now += ms) };
}

describe("interrupt budget", () => {
  it("lets Greg speak up to the daily limit, then stays silent", () => {
    const { store } = storeAt(Date.UTC(2026, 9, 15, 12));
    const reasons = Array.from({ length: DAILY_INTERRUPT_LIMIT }, (_, i) => `r${i}`);
    for (const reason of reasons) expect(store.interrupts.spend(reason)).toMatchObject({ ok: true, value: { allowed: true, why: "spent" } });
    expect(store.interrupts.spend("one-too-many")).toEqual({ ok: true, value: { allowed: false, remaining: 0, why: "budget" } });
    expect(store.interrupts.state()).toEqual({ limit: DAILY_INTERRUPT_LIMIT, used: DAILY_INTERRUPT_LIMIT, remaining: 0 });
  });

  it("never repeats the same reason on the same day, and says so without spending more", () => {
    const { store } = storeAt(Date.UTC(2026, 9, 15, 12));
    expect(store.interrupts.spend("focus-end:a")).toMatchObject({ value: { allowed: true, remaining: 2 } });
    expect(store.interrupts.spend("focus-end:a")).toEqual({ ok: true, value: { allowed: false, remaining: 2, why: "already" } });
  });

  it("starts fresh on the next day", () => {
    const { store, advance } = storeAt(Date.UTC(2026, 9, 15, 12));
    for (let i = 0; i < DAILY_INTERRUPT_LIMIT; i += 1) store.interrupts.spend(`r${i}`);
    advance(2 * DAY);
    expect(store.interrupts.state().remaining).toBe(DAILY_INTERRUPT_LIMIT);
    expect(store.interrupts.spend("r0")).toMatchObject({ value: { allowed: true } });
  });

  it("rejects an empty reason", () => {
    const { store } = storeAt(1);
    expect(store.interrupts.spend("  ")).toMatchObject({ ok: false, error: { code: "invalid" } });
  });

  it("treats a corrupt stored row as a fresh day instead of crashing", () => {
    const path = join(mkdtempSync(join(tmpdir(), "heel-interrupts-")), "heel.db");
    const store = openStore({ path, now: () => Date.UTC(2026, 9, 15, 12) });
    store.interrupts.spend("x");
    store.close();
    const raw = new DatabaseSync(path);
    raw.prepare("UPDATE settings SET value = ? WHERE key = 'interrupts'").run("{not json");
    raw.close();
    const reopened = openStore({ path, now: () => Date.UTC(2026, 9, 15, 12) });
    expect(reopened.interrupts.state().used).toBe(0);
    reopened.close();
  });
});
