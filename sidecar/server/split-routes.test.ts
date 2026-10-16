import { describe, expect, it } from "vitest";
import { SplitProposalSchema, SplitResultSchema, TasksStateSchema, UnsplitResultSchema, envelope } from "../../shared/api";
import { fakeProvider, setup } from "./test-app";

const proposal = envelope(SplitProposalSchema);
const split = envelope(SplitResultSchema);
const unsplit = envelope(UnsplitResultSchema);
const tasks = envelope(TasksStateSchema);

describe("splitting a task", () => {
  it("proposes steps from the AI without writing, applies the kept ones under the parent, and undoes", async () => {
    const claude = fakeProvider("claude", {}, { ok: true, value: [] }, { ok: true, value: '{"steps": ["Book the van", "Pack the desks", "Tell the landlord"]}' });
    const { store, json, post } = setup({ claude });
    store.settings.setBrain({ provider: "claude", model: null });
    const big = store.tasks.add({ title: "Move the studio" });
    if (!big.ok) throw new Error(big.error.message);
    const proposed = proposal.parse(await post(`/tasks/${big.value.id}/split/propose`, {}));
    expect(proposed).toEqual({ ok: true, data: { steps: ["Book the van", "Pack the desks", "Tell the landlord"] } });
    expect(tasks.parse(await json("/tasks"))).toMatchObject({ data: { tasks: [{ title: "Move the studio" }] } });
    const applied = split.parse(await post(`/tasks/${big.value.id}/split`, { titles: ["Book the van", "Tell the landlord"] }));
    if (!applied.ok) throw new Error(applied.error.message);
    expect(applied.data.children.map((c) => [c.title, c.parentId])).toEqual([["Book the van", big.value.id], ["Tell the landlord", big.value.id]]);
    store.tasks.complete(applied.data.children[0]!.id);
    expect(tasks.parse(await json("/tasks"))).toMatchObject({ data: { tasks: [{ title: "Move the studio", stepsDone: 1 }, { title: "Tell the landlord", parentId: big.value.id }] } });
    expect(unsplit.parse(await post(`/tasks/${big.value.id}/unsplit`, {}))).toEqual({ ok: true, data: { count: 1 } });
    expect(tasks.parse(await json("/tasks"))).toMatchObject({ data: { tasks: [{ title: "Move the studio" }] } });
  });

  it("says when no AI is chosen, and when the task is unknown", async () => {
    const { post } = setup();
    expect(proposal.parse(await post("/tasks/nope/split/propose", {}))).toMatchObject({ ok: false, error: { code: "not_found" } });
    const { store, post: post2 } = setup();
    const big = store.tasks.add({ title: "Big" });
    if (!big.ok) throw new Error(big.error.message);
    expect(proposal.parse(await post2(`/tasks/${big.value.id}/split/propose`, {}))).toMatchObject({ ok: false, error: { code: "not_ready" } });
  });
});
