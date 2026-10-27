import { describe, expect, it } from "vitest";
import { dayKey, daysAgo, groupByDay, startOfDay, weekOf } from "./history";
import { testStore } from "./test-helpers";

/** One worker per test file, so the zone is this file's alone. Madrid has a 23-hour day each March and a 25-hour day each October. */
process.env.TZ = "Europe/Madrid";

const DAY = 86_400_000;
/** A fixed local noon so day boundaries are unambiguous whatever the machine's zone. */
const NOON = new Date(2026, 9, 15, 12, 0, 0).getTime();

function must<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("dayKey / startOfDay", () => {
  it("names the local day and finds its midnight", () => {
    expect(dayKey(NOON)).toBe("2026-10-15");
    expect(new Date(startOfDay(NOON)).getHours()).toBe(0);
    expect(dayKey(startOfDay(NOON) - 1)).toBe("2026-10-14");
  });
});

describe("history", () => {
  it("groups finished tasks by local day, newest first, and counts the week with zeros for empty days", () => {
    let clock = NOON - 2 * DAY;
    const store = testStore({ now: () => clock });
    const a = must(store.tasks.add({ title: "Two days ago" }));
    must(store.tasks.complete(a.id));
    clock = NOON;
    const b = must(store.tasks.add({ title: "Today first" }));
    const c = must(store.tasks.add({ title: "Today second" }));
    must(store.tasks.complete(b.id));
    clock = NOON + 60_000;
    must(store.tasks.complete(c.id));
    const open = must(store.tasks.add({ title: "Still open" }));
    void open;

    const result = store.history.list(30);
    expect(result.days.map((d) => [d.date, d.count, d.tasks.map((t) => t.title)])).toEqual([
      ["2026-10-15", 2, ["Today second", "Today first"]],
      ["2026-10-13", 1, ["Two days ago"]],
    ]);
    expect(result.week.map((d) => d.count)).toEqual([0, 0, 0, 0, 1, 0, 2]);
    expect(result.week.at(-1)?.date).toBe("2026-10-15");
    expect(store.history.doneToday()).toBe(2);
  });

  it("drops a restored task from the record and the count", () => {
    const store = testStore({ now: () => NOON });
    const a = must(store.tasks.add({ title: "Oops" }));
    must(store.tasks.complete(a.id));
    must(store.tasks.restore(a.id));
    expect(store.history.list(7).days).toEqual([]);
    expect(store.history.doneToday()).toBe(0);
  });

  it("keeps the list window separate from the week strip", () => {
    const tasks = [{ completedAt: NOON, updatedAt: NOON }, { completedAt: NOON - 10 * DAY, updatedAt: NOON }] as never[];
    expect(groupByDay(tasks).length).toBe(2);
    expect(weekOf(tasks, NOON, 7).reduce((s, d) => s + d.count, 0)).toBe(1);
  });
});

describe("across a clock change (Europe/Madrid: 2026-03-29 forward, 2026-10-25 back)", () => {
  it("names seven distinct days in the week strip the day after the clocks go forward", () => {
    const now = new Date(2026, 2, 30, 12).getTime();
    expect(weekOf([], now, 7).map((d) => d.date)).toEqual(["2026-03-24", "2026-03-25", "2026-03-26", "2026-03-27", "2026-03-28", "2026-03-29", "2026-03-30"]);
    expect(new Date(daysAgo(now, 1)).getHours()).toBe(0);
  });

  it("keeps a task finished just after midnight on the window's first day, the week after the clocks go back", () => {
    let clock = new Date(2026, 9, 20, 0, 30).getTime();
    const store = testStore({ now: () => clock });
    const early = must(store.tasks.add({ title: "Early" }));
    must(store.tasks.complete(early.id));
    clock = new Date(2026, 9, 26, 12).getTime();
    const result = store.history.list(7);
    expect(result.days.map((d) => d.date)).toEqual(["2026-10-20"]);
    expect(result.week[0]).toEqual({ date: "2026-10-20", count: 1 });
  });
});
