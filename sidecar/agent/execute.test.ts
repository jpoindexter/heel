import { describe, expect, it } from "vitest";
import { testStore } from "../store/test-helpers";
import type { Action } from "./actions";
import { executeActions, type TaskRefs } from "./execute";

function setup() {
  const store = testStore();
  const first = store.tasks.add({ title: "First" });
  if (!first.ok) throw new Error("setup failed");
  const refs: TaskRefs = new Map([["t1", first.value.id]]);
  return { store, refs, firstId: first.value.id };
}

describe("executeActions", () => {
  it("adds a task from the capture source with its first step", () => {
    const { store, refs } = setup();
    const [outcome] = executeActions(store, [{ type: "add_task", title: " Email Aoi ", now_step: "Open Gmail" }], refs);
    expect(outcome).toMatchObject({ type: "add_task", ok: true, message: 'Added "Email Aoi".', undo: { kind: "drop_task" } });
    expect(store.tasks.list().at(-1)).toMatchObject({ title: "Email Aoi", source: "capture", nowStep: "Open Gmail" });
  });

  it("resolves refs to real ids for complete, set_now_step and drop", () => {
    const { store, refs, firstId } = setup();
    const outcomes = executeActions(store, [{ type: "set_now_step", task: "t1", step: "Open the doc" }, { type: "complete_task", task: "t1" }], refs);
    expect(outcomes.map((o) => o.ok)).toEqual([true, true]);
    expect(store.tasks.get(firstId)).toMatchObject({ ok: true, value: { status: "done", nowStep: "Open the doc" } });
  });

  it("reports an unknown ref and lists the known ones, never guessing", () => {
    const { store, refs } = setup();
    const [outcome] = executeActions(store, [{ type: "complete_task", task: "t9" }], refs);
    expect(outcome).toEqual({ type: "complete_task", ok: false, message: 'Unknown task "t9". Known tasks: t1.' });
  });

  it("keeps going after a failed action and reports each one", () => {
    const { store, refs } = setup();
    const actions: Action[] = [
      { type: "add_task", title: "   " },
      { type: "park_idea", idea: "Build skins" },
    ];
    const outcomes = executeActions(store, actions, refs);
    expect(outcomes.map((o) => o.ok)).toEqual([false, true]);
    expect(outcomes[0]!.message).toBe("Task title can't be empty.");
    expect(store.parked.list()).toHaveLength(1);
  });

  it("names tasks by title in receipts, never by ref", () => {
    const { store, refs } = setup();
    const outcomes = executeActions(store, [{ type: "complete_task", task: "t1" }], refs);
    expect(outcomes[0]!.message).toBe('Completed "First".');
    expect(outcomes[0]!.message).not.toContain("t1");
  });

  it("says how each write can be reversed", () => {
    const { store, refs, firstId } = setup();
    const [complete, park] = executeActions(store, [{ type: "complete_task", task: "t1" }, { type: "park_idea", idea: "Skins" }], refs);
    expect(complete!.undo).toEqual({ kind: "restore_task", id: firstId });
    expect(park!.undo).toEqual({ kind: "unpark", id: store.parked.list()[0]!.id });
    const [stepOnly] = executeActions(store, [{ type: "set_now_step", task: "t1", step: "x" }], refs);
    expect(stepOnly!.undo).toBeUndefined();
  });
});
