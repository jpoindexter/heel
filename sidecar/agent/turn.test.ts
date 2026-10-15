import { describe, expect, it } from "vitest";
import { testStore } from "../store/test-helpers";
import { MAX_USER_CHARS, runTurn } from "./turn";
import type { CompleteRequest, Provider, ProviderResult } from "./providers/types";

function fakeProvider(replies: ProviderResult<string>[]): Provider & { requests: CompleteRequest[] } {
  const requests: CompleteRequest[] = [];
  return {
    id: "codex",
    label: "Fake",
    requests,
    status: async () => ({ id: "codex", label: "Fake", installed: true, ready: true, detail: "fake" }),
    models: async () => ({ ok: true, value: [] }),
    complete: async (request) => {
      requests.push(request);
      return replies[Math.min(requests.length - 1, replies.length - 1)]!;
    },
  };
}

const good = (reply: object): ProviderResult<string> => ({ ok: true, value: JSON.stringify(reply) });
const prose: ProviderResult<string> = { ok: true, value: "Done! I added your tasks." };

describe("runTurn", () => {
  it("applies validated actions and returns what to say", async () => {
    const store = testStore();
    const provider = fakeProvider([
      good({ say: "Two tasks added. Start with the email.", actions: [{ type: "add_task", title: "Email Aoi", now_step: "Open Gmail" }, { type: "park_idea", idea: "Research X" }] }),
    ]);
    const result = await runTurn({ store, provider, model: null }, "email Aoi, also research X");
    expect(result).toMatchObject({ ok: true, say: "Two tasks added. Start with the email.", provider: "codex" });
    if (result.ok) expect(result.applied.map((a) => a.ok)).toEqual([true, true]);
    expect(store.tasks.list().map((t) => t.title)).toEqual(["Email Aoi"]);
    expect(store.parked.list().map((p) => p.idea)).toEqual(["Research X"]);
  });

  it("retries once with the rejection reason, then applies the valid reply", async () => {
    const store = testStore();
    const provider = fakeProvider([prose, good({ say: "Added.", actions: [{ type: "add_task", title: "Ship" }] })]);
    const result = await runTurn({ store, provider, model: null }, "ship it");
    expect(result.ok).toBe(true);
    expect(provider.requests).toHaveLength(2);
    expect(provider.requests[1]!.prompt).toContain("Your previous reply was rejected: the reply was not a JSON object");
    expect(store.tasks.list()).toHaveLength(1);
  });

  it("stops after one retry and writes nothing when the model never returns valid JSON", async () => {
    const store = testStore();
    const provider = fakeProvider([prose]);
    const result = await runTurn({ store, provider, model: null }, "add a task");
    expect(result).toMatchObject({ ok: false, error: { code: "bad_reply" } });
    expect(provider.requests).toHaveLength(2);
    expect(store.tasks.list()).toEqual([]);
  });

  it("surfaces a provider error unchanged and writes nothing", async () => {
    const store = testStore();
    const provider = fakeProvider([{ ok: false, error: { code: "not_signed_in", message: "Run codex login." } }]);
    const result = await runTurn({ store, provider, model: null }, "hello");
    expect(result).toEqual({ ok: false, error: { code: "not_signed_in", message: "Run codex login." } });
    expect(provider.requests).toHaveLength(1);
  });

  it("rejects empty and oversized input without calling the provider", async () => {
    const provider = fakeProvider([prose]);
    const store = testStore();
    expect(await runTurn({ store, provider, model: null }, "   ")).toMatchObject({ ok: false, error: { code: "empty_input" } });
    const long = await runTurn({ store, provider, model: null }, "x".repeat(MAX_USER_CHARS + 1));
    expect(long).toMatchObject({ ok: false, error: { code: "empty_input" } });
    expect(provider.requests).toHaveLength(0);
  });

  it("sends the router skill and task refs, keeps the person's words out of the system prompt, and passes the model", async () => {
    const store = testStore();
    store.tasks.add({ title: "Existing" });
    const provider = fakeProvider([good({ say: "ok" })]);
    await runTurn({ store, provider, model: "gpt-test" }, "I am stuck on the secret-word-123");
    const request = provider.requests[0]!;
    expect(request.model).toBe("gpt-test");
    expect(request.system).toContain("### nd-executive-function-router");
    expect(request.system).toContain("### nd-task-initiation");
    expect(request.system).not.toContain("secret-word-123");
    expect(request.prompt).toContain("t1 [todo] Existing");
    expect(request.prompt).toContain("secret-word-123");
  });

  it("reports an action on an unknown ref but still returns the reply", async () => {
    const store = testStore();
    const provider = fakeProvider([good({ say: "Done.", actions: [{ type: "complete_task", task: "t4" }] })]);
    const result = await runTurn({ store, provider, model: null }, "finish it");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.applied[0]).toMatchObject({ ok: false });
  });
});

describe("runTurn when stopped", () => {
  it("writes nothing, even if the model had already answered", async () => {
    const store = testStore();
    const stop = new AbortController();
    const provider = fakeProvider([good({ say: "Added.", actions: [{ type: "add_task", title: "Ship" }] })]);
    const slow: Provider = { ...provider, complete: async (request) => { stop.abort(); return provider.complete(request); } };
    const result = await runTurn({ store, provider: slow, model: null, signal: stop.signal }, "ship it");
    expect(result).toEqual({ ok: false, error: { code: "aborted", message: "Stopped." } });
    expect(store.tasks.list()).toEqual([]);
  });

  it("passes the stop signal to the provider so it can kill its work", async () => {
    const stop = new AbortController();
    const provider = fakeProvider([good({ say: "ok", actions: [] })]);
    await runTurn({ store: testStore(), provider, model: null, signal: stop.signal }, "hi");
    expect(provider.requests[0]!.signal).toBe(stop.signal);
  });
});
