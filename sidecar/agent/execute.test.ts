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
    expect(outcome).toEqual({ type: "add_task", ok: true, message: 'Added "Email Aoi".' });
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

  it("starts and ends a focus session, and refuses to end one that isn't running", () => {
    const { store, refs } = setup();
    const noneRunning = executeActions(store, [{ type: "end_focus", outcome: "done" }], refs);
    expect(noneRunning[0]).toMatchObject({ ok: false, message: "No focus session is running." });

    const started = executeActions(store, [{ type: "start_focus", goal: "Write plan", best_min: 20, realistic_min: 40, worst_min: 90, task: "t1" }], refs);
    expect(started[0]!.ok).toBe(true);
    expect(store.focus.active()?.goal).toBe("Write plan");

    const ended = executeActions(store, [{ type: "end_focus", outcome: "parked_and_returned" }], refs);
    expect(ended[0]!.ok).toBe(true);
    expect(store.focus.active()).toBeNull();
  });

  it("rejects a focus session tied to an unknown task ref", () => {
    const { store, refs } = setup();
    const [outcome] = executeActions(store, [{ type: "start_focus", goal: "g", best_min: 1, realistic_min: 2, worst_min: 3, task: "t7" }], refs);
    expect(outcome!.ok).toBe(false);
    expect(store.focus.active()).toBeNull();
  });
});
