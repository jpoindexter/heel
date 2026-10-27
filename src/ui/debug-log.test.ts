import { afterEach, describe, expect, it } from "vitest";
import { DEBUG_LOG_CAP, DEBUG_LOG_KEY, append, clearDebugLog, formatEntry, logDebug, parseLog, readDebugLog, type DebugEntry } from "./debug-log";

const store = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  value: { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } },
  configurable: true,
});
afterEach(() => store.clear());

const entry = (n: number): DebugEntry => ({ at: n, level: "info", where: "test", text: `line ${n}` });

describe("the ring", () => {
  it("keeps order, drops the oldest past the cap, and keeps the text short and on one line", () => {
    let log: DebugEntry[] = [];
    for (let n = 0; n < DEBUG_LOG_CAP + 5; n++) log = append(log, entry(n));
    expect(log).toHaveLength(DEBUG_LOG_CAP);
    expect(log[0]?.text).toBe("line 5");
    expect(log.at(-1)?.text).toBe(`line ${DEBUG_LOG_CAP + 4}`);
    const long = append([], { ...entry(1), text: `a\n  b${"x".repeat(400)}` });
    expect(long[0]?.text.startsWith("a b")).toBe(true);
    expect(long[0]?.text.length).toBe(300);
  });

  it("survives a JSON round trip, drops unparseable entries and shrugs at garbage", () => {
    const log = [entry(1), entry(2)];
    expect(parseLog(JSON.stringify(log))).toEqual(log);
    expect(parseLog(JSON.stringify([entry(1), { at: "no" }, "junk", entry(3)]))).toEqual([entry(1), entry(3)]);
    expect(parseLog("{not json")).toEqual([]);
    expect(parseLog(null)).toEqual([]);
    expect(parseLog('{"a":1}')).toEqual([]);
  });

  it("formats an entry with local time, the level and the place", () => {
    const at = new Date(2026, 9, 27, 9, 5, 3).getTime();
    expect(formatEntry({ at, level: "error", where: "panel", text: "render crashed" })).toBe("2026-10-27 09:05:03 error panel: render crashed");
  });
});

describe("the adapter", () => {
  it("writes to heel:debug-log, reads it back, and clears it", () => {
    logDebug("warn", "helper", "stopped", () => 7);
    expect(store.get(DEBUG_LOG_KEY)).toContain('"where":"helper"');
    expect(readDebugLog()).toEqual([{ at: 7, level: "warn", where: "helper", text: "stopped" }]);
    clearDebugLog();
    expect(readDebugLog()).toEqual([]);
  });
});
