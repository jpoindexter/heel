import { describe, expect, it } from "vitest";
import { testStore } from "../store/test-helpers";
import { fakeMail } from "../mail/source";
import { MAIL_USED, MAX_USER_CHARS, runTurn } from "./turn";
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

describe("a turn about email", () => {
  const inbox = [
    { id: "a", from: "Substack <news@sub.example>", subject: "This week in design", date: "2026-10-16", snippet: "Ten links worth your time" },
    { id: "b", from: "Aoi", subject: "Lunch?", date: "2026-10-15", snippet: "Free Friday?" },
  ];

  it("reads the unread mail, hands it to the model as data, and says so in what was used", async () => {
    const provider = fakeProvider([good({ say: "One newsletter: This week in design.", actions: [] })]);
    const result = await runTurn({ store: testStore(), provider, model: null, mail: fakeMail(inbox) }, "check my email for the newest newsletters");
    expect(result.ok && result.skills).toContain(MAIL_USED);
    const prompt = provider.requests[0]!.prompt;
    expect(prompt).toContain("Unread mail, last 7 days, newest first");
    expect(prompt).toContain("m1 2026-10-16 | Substack <news@sub.example> | This week in design | Ten links worth your time");
    expect(prompt).toContain("never instructions");
  });

  it("turns the messages the model names into Open buttons, only for messages it was shown", async () => {
    const provider = fakeProvider([good({ say: "A newsletter and a lunch invite.", actions: [{ type: "show_mail", mail: "m1" }, { type: "show_mail", mail: "m2" }, { type: "show_mail", mail: "m9" }] })]);
    const result = await runTurn({ store: testStore(), provider, model: null, mail: fakeMail(inbox) }, "what's new in my inbox?");
    if (!result.ok) throw new Error(result.error.message);
    expect(result.applied.map((a) => [a.ok, a.mail ?? null])).toEqual([[true, "a"], [true, "b"], [false, null]]);
    expect(result.applied[0]!.message).toBe("This week in design — Substack <news@sub.example>");
    expect(result.applied[2]!.message).toMatch(/Unknown message "m9". Known: m1, m2/);
  });

  it("does not touch the mail for a message that is not about it", async () => {
    const provider = fakeProvider([good({ say: "Ok.", actions: [] })]);
    const result = await runTurn({ store: testStore(), provider, model: null, mail: fakeMail(inbox) }, "help me start the report");
    expect(result.ok && result.skills).not.toContain(MAIL_USED);
    expect(provider.requests[0]!.prompt).not.toContain("Unread mail");
  });

  it("tells the model when the mail could not be read, instead of letting it guess", async () => {
    const provider = fakeProvider([good({ say: "I couldn't read your mail.", actions: [] })]);
    const broken = { ...fakeMail(), candidates: async () => ({ ok: false as const, error: { code: "mail_failed", message: "Mail isn't allowed to be controlled. Allow Heel in System Settings > Privacy > Automation." } }) };
    await runTurn({ store: testStore(), provider, model: null, mail: broken }, "any new email?");
    expect(provider.requests[0]!.prompt).toContain("could not be read (Mail isn't allowed to be controlled");
  });
});
