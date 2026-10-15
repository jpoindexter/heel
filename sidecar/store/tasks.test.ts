import { describe, expect, it } from "vitest";
import { testStore } from "./test-helpers";

function must<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("tasks", () => {
  it("adds a trimmed task as todo from the manual source", () => {
    const store = testStore();
    const task = must(store.tasks.add({ title: "  Email Finn  " }));
    expect(task).toMatchObject({ title: "Email Finn", status: "todo", source: "manual", nowStep: null });
  });

  it("rejects an empty title with a sentence that says what to do", () => {
    const result = testStore().tasks.add({ title: "   " });
    expect(result).toEqual({ ok: false, error: { code: "invalid", message: "Task title can't be empty." } });
  });

  it("rejects a title over 500 characters and says the limit", () => {
    const result = testStore().tasks.add({ title: "x".repeat(501) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("500");
  });

  it("lists open tasks in the order added and hides dropped ones", () => {
    const store = testStore();
    const a = must(store.tasks.add({ title: "A" }));
    must(store.tasks.add({ title: "B" }));
    must(store.tasks.drop(a.id));
    expect(store.tasks.list().map((t) => t.title)).toEqual(["B"]);
    expect(store.tasks.list(["dropped"]).map((t) => t.title)).toEqual(["A"]);
  });

  it("completes a task, then restore clears completedAt (undo)", () => {
    const store = testStore();
    const task = must(store.tasks.add({ title: "Ship" }));
    const done = must(store.tasks.complete(task.id));
    expect(done.status).toBe("done");
    expect(done.completedAt).not.toBeNull();
    const back = must(store.tasks.restore(task.id));
    expect(back).toMatchObject({ status: "todo", completedAt: null });
  });

  it("refuses to complete a dropped task", () => {
    const store = testStore();
    const task = must(store.tasks.add({ title: "Nope" }));
    must(store.tasks.drop(task.id));
    const result = store.tasks.complete(task.id);
    expect(result).toEqual({ ok: false, error: { code: "conflict", message: "Can't move a dropped task to done." } });
  });

  it("returns not_found for an unknown id", () => {
    const result = testStore().tasks.complete("missing");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_found");
  });

  it("sets and clears the next step, and rejects an empty one", () => {
    const store = testStore();
    const task = must(store.tasks.add({ title: "Write plan" }));
    expect(must(store.tasks.setNowStep(task.id, " Open the doc "))).toMatchObject({ nowStep: "Open the doc" });
    expect(must(store.tasks.setNowStep(task.id, null)).nowStep).toBeNull();
    expect(store.tasks.setNowStep(task.id, "  ").ok).toBe(false);
  });

  it("moves a todo task to doing and keeps it in the open list", () => {
    const store = testStore();
    const task = must(store.tasks.add({ title: "Focus" }));
    must(store.tasks.start(task.id));
    expect(store.tasks.list().map((t) => t.status)).toEqual(["doing"]);
  });
});
