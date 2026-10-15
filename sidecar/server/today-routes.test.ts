import { describe, expect, it } from "vitest";
import { MAX_HISTORY_MESSAGES, ParkedListSchema, ParkedResultSchema, TasksStateSchema, TurnResultSchema, envelope } from "../../shared/api";
import { fakeProvider, setup } from "./test-app";

const tasksState = envelope(TasksStateSchema);
const turnResult = envelope(TurnResultSchema);
const parkedList = envelope(ParkedListSchema);
const parkedResult = envelope(ParkedResultSchema);

describe("GET /tasks", () => {
  it("is empty at first", async () => {
    expect(tasksState.parse(await setup().json("/tasks"))).toEqual({ ok: true, data: { tasks: [], parkedCount: 0 } });
  });

  it("lists open tasks in order and counts parked ideas", async () => {
    const { store, json } = setup();
    store.tasks.add({ title: "First", nowStep: "Open the doc" });
    store.tasks.add({ title: "Second" });
    store.parked.park({ idea: "Skins" });
    const result = tasksState.parse(await json("/tasks"));
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.tasks.map((t) => [t.title, t.nowStep])).toEqual([["First", "Open the doc"], ["Second", null]]);
    expect(result.data.parkedCount).toBe(1);
  });
});

describe("POST /tasks/:id/:action", () => {
  it("completes a task, which then leaves the open list, and restore (undo) brings it back", async () => {
    const { store, post, json } = setup();
    const added = store.tasks.add({ title: "Ship" });
    if (!added.ok) throw new Error("setup");
    expect(await post(`/tasks/${added.value.id}/complete`)).toMatchObject({ ok: true, data: { task: { status: "done" } } });
    expect(tasksState.parse(await json("/tasks"))).toMatchObject({ data: { tasks: [] } });
    expect(await post(`/tasks/${added.value.id}/restore`)).toMatchObject({ ok: true, data: { task: { status: "todo" } } });
    expect(tasksState.parse(await json("/tasks"))).toMatchObject({ data: { tasks: [{ title: "Ship" }] } });
  });

  it("drops a task", async () => {
    const { store, post } = setup();
    const added = store.tasks.add({ title: "Nope" });
    if (!added.ok) throw new Error("setup");
    expect(await post(`/tasks/${added.value.id}/drop`)).toMatchObject({ ok: true, data: { task: { status: "dropped" } } });
  });

  it("reports an unknown task and an unknown action as sentences", async () => {
    const { post } = setup();
    expect(await post("/tasks/missing/complete")).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(await post("/tasks/missing/explode")).toEqual({
      ok: false,
      error: { code: "invalid", message: "Action must be complete, drop or restore." },
    });
  });
});

describe("POST /parked", () => {
  it("parks an idea without needing any AI provider", async () => {
    const { post, json } = setup();
    const parked = await post("/parked", { text: "  Research Tommy Lexen  " });
    expect(parked).toMatchObject({ ok: true });
    expect(tasksState.parse(await json("/tasks"))).toMatchObject({ data: { parkedCount: 1 } });
  });

  it("rejects empty text with the store's sentence and a malformed body with a hint", async () => {
    const { post, call } = setup();
    expect(await post("/parked", { text: "   " })).toEqual({ ok: false, error: { code: "invalid", message: "Idea can't be empty." } });
    const bad = await call("/parked", { method: "POST", body: "{nope" });
    expect(await bad.json()).toMatchObject({ ok: false, error: { code: "invalid" } });
  });
});

describe("parked ideas", () => {
  it("lists parked ideas, promotes one to a task, and unparks one (undo)", async () => {
    const { post, json } = setup();
    const first = parkedResult.parse(await post("/parked", { text: "Skins" }));
    const second = parkedResult.parse(await post("/parked", { text: "Dark mode" }));
    if (!first.ok || !second.ok) throw new Error("setup");
    const listed = parkedList.parse(await json("/parked"));
    if (!listed.ok) throw new Error(listed.error.message);
    expect(listed.data.parked.map((p) => p.idea)).toEqual(["Dark mode", "Skins"]);

    expect(await post(`/parked/${first.data.id}/promote`)).toMatchObject({ ok: true, data: { task: { title: "Skins" } } });
    expect(await post(`/parked/${second.data.id}/unpark`)).toMatchObject({ ok: true, data: { id: second.data.id } });
    expect(parkedList.parse(await json("/parked"))).toEqual({ ok: true, data: { parked: [] } });
  });

  it("explains an unknown idea and a double promotion", async () => {
    const { post } = setup();
    expect(await post("/parked/nope/unpark")).toMatchObject({ ok: false, error: { code: "not_found" } });
    const parked = parkedResult.parse(await post("/parked", { text: "Skins" }));
    if (!parked.ok) throw new Error("setup");
    await post(`/parked/${parked.data.id}/promote`);
    expect(await post(`/parked/${parked.data.id}/promote`)).toMatchObject({ ok: false, error: { code: "conflict" } });
  });
});

describe("POST /turn", () => {
  const reply = {
    say: "Added it. Start with the subject line.",
    actions: [{ type: "add_task", title: "Newsletter", now_step: "Write the subject line" }],
  };

  it("asks for a provider when none is chosen", async () => {
    expect(await setup().post("/turn", { text: "hello" })).toEqual({
      ok: false,
      error: { code: "not_ready", message: "Choose an AI provider in Settings first." },
    });
  });

  it("runs a turn through the chosen provider, applies the actions, and returns the reply", async () => {
    const claude = fakeProvider("claude", {}, { ok: true, value: [] }, { ok: true, value: JSON.stringify(reply) });
    const { put, post, store } = setup({ claude });
    await put({ provider: "claude", model: null });
    const result = turnResult.parse(await post("/turn", { text: "I'm stuck on the newsletter" }));
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data).toMatchObject({ say: reply.say, provider: "claude" });
    expect(result.data.applied).toMatchObject([{ type: "add_task", ok: true, message: 'Added "Newsletter".', undo: { kind: "drop_task" } }]);
    expect(store.tasks.list()[0]).toMatchObject({ title: "Newsletter", nowStep: "Write the subject line" });
  });

  it("returns a sentence and writes nothing when the model never produces valid JSON", async () => {
    const claude = fakeProvider("claude", {}, { ok: true, value: [] }, { ok: true, value: "Sure, done!" });
    const { put, post, store } = setup({ claude });
    await put({ provider: "claude", model: null });
    expect(await post("/turn", { text: "add a task" })).toMatchObject({ ok: false, error: { code: "bad_reply" } });
    expect(store.tasks.list()).toEqual([]);
  });

  it("passes a provider failure through unchanged", async () => {
    const claude = fakeProvider("claude", {}, { ok: true, value: [] }, { ok: false, error: { code: "timeout", message: "Claude took too long." } });
    const { put, post } = setup({ claude });
    await put({ provider: "claude", model: null });
    expect(await post("/turn", { text: "hello" })).toEqual({ ok: false, error: { code: "timeout", message: "Claude took too long." } });
  });

  it("accepts earlier messages as context but only a bounded number", async () => {
    const claude = fakeProvider("claude", {}, { ok: true, value: [] }, { ok: true, value: JSON.stringify({ say: "ok" }) });
    const { put, post } = setup({ claude });
    await put({ provider: "claude", model: null });
    const history = Array.from({ length: MAX_HISTORY_MESSAGES }, (_, i) => ({ role: i % 2 ? "heel" : "user", text: `m${i}` }));
    expect(await post("/turn", { text: "yes", history })).toMatchObject({ ok: true });
    expect(await post("/turn", { text: "yes", history: [...history, history[0]] })).toMatchObject({ ok: false, error: { code: "invalid" } });
  });

  it("rejects a body without text", async () => {
    expect(await setup().post("/turn", { nope: 1 })).toMatchObject({ ok: false, error: { code: "invalid" } });
  });
});
