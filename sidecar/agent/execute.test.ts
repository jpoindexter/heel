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
  it("adds a task from the capture source with its first step", async () => {
    const { store, refs } = setup();
    const [outcome] = await executeActions(store, [{ type: "add_task", title: " Email Aoi ", now_step: "Open Gmail" }], refs);
    expect(outcome).toMatchObject({ type: "add_task", ok: true, message: 'Added "Email Aoi".', undo: { kind: "drop_task" } });
    expect(store.tasks.list().at(-1)).toMatchObject({ title: "Email Aoi", source: "capture", nowStep: "Open Gmail" });
  });

  it("resolves refs to real ids for complete, set_now_step and drop", async () => {
    const { store, refs, firstId } = setup();
    const outcomes = await executeActions(store, [{ type: "set_now_step", task: "t1", step: "Open the doc" }, { type: "complete_task", task: "t1" }], refs);
    expect(outcomes.map((o) => o.ok)).toEqual([true, true]);
    expect(store.tasks.get(firstId)).toMatchObject({ ok: true, value: { status: "done", nowStep: "Open the doc" } });
  });

  it("reports an unknown ref and lists the known ones, never guessing", async () => {
    const { store, refs } = setup();
    const [outcome] = await executeActions(store, [{ type: "complete_task", task: "t9" }], refs);
    expect(outcome).toEqual({ type: "complete_task", ok: false, message: 'Unknown task "t9". Known tasks: t1.' });
  });

  it("keeps going after a failed action and reports each one", async () => {
    const { store, refs } = setup();
    const actions: Action[] = [
      { type: "add_task", title: "   " },
      { type: "park_idea", idea: "Build skins" },
    ];
    const outcomes = await executeActions(store, actions, refs);
    expect(outcomes.map((o) => o.ok)).toEqual([false, true]);
    expect(outcomes[0]!.message).toBe("Task title can't be empty.");
    expect(store.parked.list()).toHaveLength(1);
  });

  it("names tasks by title in receipts, never by ref", async () => {
    const { store, refs } = setup();
    const outcomes = await executeActions(store, [{ type: "complete_task", task: "t1" }], refs);
    expect(outcomes[0]!.message).toBe('Completed "First".');
    expect(outcomes[0]!.message).not.toContain("t1");
  });

  it("says how each write can be reversed", async () => {
    const { store, refs, firstId } = setup();
    const [complete, park] = await executeActions(store, [{ type: "complete_task", task: "t1" }, { type: "park_idea", idea: "Skins" }], refs);
    expect(complete!.undo).toEqual({ kind: "restore_task", id: firstId });
    expect(park!.undo).toEqual({ kind: "unpark", id: store.parked.list()[0]!.id });
    const [stepOnly] = await executeActions(store, [{ type: "set_now_step", task: "t1", step: "x" }], refs);
    expect(stepOnly!.undo).toBeUndefined();
  });
});

describe("draft_email", () => {
  it("opens a draft in Mail and says so, never claiming it was sent", async () => {
    const { store, refs } = setup();
    const drafts: unknown[] = [];
    const mail = { draft: async (input: unknown) => (drafts.push(input), { ok: true as const, value: true as const }) };
    const [outcome] = await executeActions(store, [{ type: "draft_email", to: "vet@example.com", subject: "Appointment for Greg", body: "Hi, could we book a check-up next week?" }], refs, { mail });
    expect(outcome).toEqual({ type: "draft_email", ok: true, message: 'Opened a draft to vet@example.com in Mail: "Appointment for Greg". Not sent.' });
    expect(drafts).toEqual([{ to: "vet@example.com", subject: "Appointment for Greg", body: "Hi, could we book a check-up next week?" }]);
  });

  it("fails in one sentence when Mail is not available, without stopping the other actions", async () => {
    const { store, refs } = setup();
    const outcomes = await executeActions(store, [{ type: "draft_email", subject: "S", body: "B" }, { type: "park_idea", idea: "Skins" }], refs);
    expect(outcomes[0]).toMatchObject({ type: "draft_email", ok: false, message: "Mail isn't available here, so no draft was opened." });
    expect(outcomes[1]!.ok).toBe(true);
  });
});
