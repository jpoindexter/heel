import { describe, expect, it } from "vitest";
import { testStore } from "./test-helpers";

function must<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("parked ideas", () => {
  it("lists newest first", () => {
    const store = testStore();
    must(store.parked.park({ idea: "first" }));
    must(store.parked.park({ idea: "second", why: "shiny" }));
    expect(store.parked.list().map((p) => p.idea)).toEqual(["second", "first"]);
  });

  it("rejects an empty idea", () => {
    const result = testStore().parked.park({ idea: " " });
    expect(result).toEqual({ ok: false, error: { code: "invalid", message: "Idea can't be empty." } });
  });

  it("promotes an idea to a task, hides it from the default list, and refuses a second promotion", () => {
    const store = testStore();
    const parked = must(store.parked.park({ idea: "Build the skins" }));
    const task = must(store.parked.promote(parked.id));
    expect(task.title).toBe("Build the skins");
    expect(store.parked.list()).toEqual([]);
    expect(store.parked.list(true)[0]?.promotedTaskId).toBe(task.id);
    const again = store.parked.promote(parked.id);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("conflict");
  });
});

describe("focus sessions", () => {
  const range = { bestMin: 25, realisticMin: 40, worstMin: 90 };

  it("keeps the goal exactly as typed so the check-in can quote it", () => {
    const store = testStore();
    const session = must(store.focus.start({ goal: "Send Finn and Aoi the panel questions", ...range }));
    expect(session.goal).toBe("Send Finn and Aoi the panel questions");
    expect(store.focus.active()?.id).toBe(session.id);
  });

  it("allows only one active session", () => {
    const store = testStore();
    must(store.focus.start({ goal: "One", ...range }));
    const second = store.focus.start({ goal: "Two", ...range });
    expect(second).toEqual({
      ok: false,
      error: { code: "conflict", message: "A focus session is already running. End it before starting another." },
    });
  });

  it("ends with an outcome, then allows the next session", () => {
    const store = testStore();
    const session = must(store.focus.start({ goal: "One", ...range }));
    const ended = must(store.focus.end(session.id, "parked_and_returned"));
    expect(ended.outcome).toBe("parked_and_returned");
    expect(store.focus.active()).toBeNull();
    expect(store.focus.start({ goal: "Two", ...range }).ok).toBe(true);
  });

  it("refuses to end the same session twice", () => {
    const store = testStore();
    const session = must(store.focus.start({ goal: "One", ...range }));
    must(store.focus.end(session.id, "done"));
    expect(store.focus.end(session.id, "done").ok).toBe(false);
  });

  it("rejects a time range that is not best <= realistic <= worst", () => {
    const result = testStore().focus.start({ goal: "x", bestMin: 60, realisticMin: 30, worstMin: 90 });
    expect(result).toEqual({
      ok: false,
      error: { code: "invalid", message: "Time range must go best <= realistic <= worst." },
    });
  });
});

describe("ledger", () => {
  it("merges patches into one ledger per task and keeps the global one separate", () => {
    const store = testStore();
    const task = must(store.tasks.add({ title: "Plan" }));
    must(store.ledger.upsert(task.id, { outcome: "Plan shipped", must: "Stay in scope" }));
    const updated = must(store.ledger.upsert(task.id, { nowStep: "Open PRD.md" }));
    expect(updated).toMatchObject({ outcome: "Plan shipped", must: "Stay in scope", nowStep: "Open PRD.md" });
    expect(store.ledger.get(null)).toBeNull();
    must(store.ledger.upsert(null, { outcome: "Ship Heel v0" }));
    expect(store.ledger.get(null)?.outcome).toBe("Ship Heel v0");
    expect(store.ledger.get(task.id)?.outcome).toBe("Plan shipped");
  });

  it("rejects non-text fields", () => {
    expect(testStore().ledger.upsert(null, { outcome: 42 }).ok).toBe(false);
  });
});

describe("unparking", () => {
  it("forgets a parked idea (undo for park)", () => {
    const store = testStore();
    const parked = must(store.parked.park({ idea: "Build skins" }));
    must(store.parked.unpark(parked.id));
    expect(store.parked.list(true)).toEqual([]);
  });

  it("refuses to forget an idea that already became a task, and reports an unknown id", () => {
    const store = testStore();
    const parked = must(store.parked.park({ idea: "Build skins" }));
    must(store.parked.promote(parked.id));
    expect(store.parked.unpark(parked.id)).toMatchObject({ ok: false, error: { code: "conflict" } });
    expect(store.parked.unpark("nope")).toMatchObject({ ok: false, error: { code: "not_found" } });
  });
});
