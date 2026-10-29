import { describe, expect, it } from "vitest";
import { anthropicProvider } from "./anthropic";
import { DEFAULT_MISTRAL_MODEL, mistralProvider } from "./mistral";
import { openaiProvider } from "./openai";
import { fakeDeps, jsonResponse } from "./test-deps";

const REQUEST = { system: "SYSTEM", prompt: "PROMPT", model: null };
const KEY = "sk-test-0123456789";

/** Answers by path; records every request so a test can check headers and bodies. */
function stubFetch(answers: Record<string, (init?: RequestInit) => Response>) {
  const seen: { url: string; init?: RequestInit }[] = [];
  const fetchStub: typeof fetch = async (url, init) => {
    seen.push({ url: String(url), init });
    const path = new URL(String(url)).pathname;
    const answer = answers[path];
    return answer ? answer(init) : jsonResponse({ error: { message: `no stub for ${path}` } }, 404);
  };
  return { fetchStub, seen };
}

const anthropicModels = () => jsonResponse({ data: [{ id: "claude-opus-5-5", lifecycle: "active" }, { id: "claude-3-opus", lifecycle: "retired" }], has_more: false });

describe("anthropic provider", () => {
  it("is not ready without a key and names where to paste one", async () => {
    const status = await anthropicProvider(fakeDeps()).status();
    expect(status).toMatchObject({ installed: false, ready: false });
    expect(status.detail).toContain("Settings › Brain");
    expect(await anthropicProvider(fakeDeps()).complete(REQUEST)).toMatchObject({ ok: false, error: { code: "not_signed_in" } });
  });

  it("keeps a key only after Anthropic answers the model list with it, and sends it as x-api-key", async () => {
    const { fetchStub, seen } = stubFetch({ "/v1/models": anthropicModels });
    const deps = fakeDeps({ fetch: fetchStub });
    const saved = await anthropicProvider(deps).saveKey(KEY);
    expect(saved).toMatchObject({ ok: true, value: { ready: true, detail: "API key in the Keychain" } });
    expect(await deps.secrets.get("provider-key:anthropic")).toBe(KEY);
    const headers = seen[0]!.init?.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe(KEY);
    expect(headers["anthropic-version"]).toBe("2026-10-21");
    expect(await anthropicProvider(deps).models()).toEqual({ ok: true, value: ["claude-opus-5-5"] });
  });

  it("does not keep a key Anthropic refuses", async () => {
    const { fetchStub } = stubFetch({ "/v1/models": () => jsonResponse({ error: { message: "invalid x-api-key" } }, 401) });
    const deps = fakeDeps({ fetch: fetchStub });
    const saved = await anthropicProvider(deps).saveKey("sk-wrong-0123456789");
    expect(saved).toMatchObject({ ok: false, error: { code: "not_signed_in" } });
    expect(await deps.secrets.get("provider-key:anthropic")).toBeNull();
  });

  it("asks with the system prompt, the default model and 16k tokens, and returns the text blocks", async () => {
    const { fetchStub, seen } = stubFetch({ "/v1/messages": () => jsonResponse({ content: [{ type: "text", text: "Hi " }, { type: "text", text: "there" }], stop_reason: "end_turn" }) });
    const deps = fakeDeps({ fetch: fetchStub, secrets: { "provider-key:anthropic": KEY } });
    expect(await anthropicProvider(deps).complete(REQUEST)).toEqual({ ok: true, value: "Hi there" });
    const body = JSON.parse(String(seen[0]!.init?.body));
    expect(body).toMatchObject({ model: "claude-opus-5-5", max_tokens: 16000, system: "SYSTEM", messages: [{ role: "user", content: "PROMPT" }] });
    expect(seen[0]!.init?.method).toBe("POST");
  });

  it("reads a refusal as a failure with the reason, and a rate limit with the provider's words", async () => {
    const refusing = stubFetch({ "/v1/messages": () => jsonResponse({ content: [], stop_reason: "refusal", stop_details: { explanation: "policy" } }) });
    const deps = fakeDeps({ fetch: refusing.fetchStub, secrets: { "provider-key:anthropic": KEY } });
    expect(await anthropicProvider(deps).complete(REQUEST)).toMatchObject({ ok: false, error: { code: "failed", message: "Claude declined: policy." } });
    const limited = stubFetch({ "/v1/messages": () => jsonResponse({ error: { message: "slow down" } }, 429) });
    const result = await anthropicProvider(fakeDeps({ fetch: limited.fetchStub, secrets: { "provider-key:anthropic": KEY } })).complete(REQUEST);
    expect(result).toMatchObject({ ok: false, error: { code: "failed" } });
    expect(result.ok ? "" : result.error.message).toContain("slow down");
  });

  it("forgets the key and is not ready again", async () => {
    const deps = fakeDeps({ secrets: { "provider-key:anthropic": KEY } });
    expect((await anthropicProvider(deps).forgetKey()).ready).toBe(false);
    expect(await deps.secrets.get("provider-key:anthropic")).toBeNull();
  });
});

describe("openai provider", () => {
  it("lists only chat models, sorted, with a bearer header", async () => {
    const { fetchStub, seen } = stubFetch({ "/v1/models": () => jsonResponse({ object: "list", data: [{ id: "text-embedding-3-small" }, { id: "gpt-5" }, { id: "o4-mini" }, { id: "dall-e-3" }] }) });
    const deps = fakeDeps({ fetch: fetchStub, secrets: { "provider-key:openai": KEY } });
    expect(await openaiProvider(deps).models()).toEqual({ ok: true, value: ["gpt-5", "o4-mini"] });
    expect((seen[0]!.init?.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`);
  });

  it("needs a chosen model, then returns the first choice's content", async () => {
    const { fetchStub, seen } = stubFetch({ "/v1/chat/completions": () => jsonResponse({ choices: [{ message: { content: " answer " }, finish_reason: "stop" }] }) });
    const deps = fakeDeps({ fetch: fetchStub, secrets: { "provider-key:openai": KEY } });
    expect(await openaiProvider(deps).complete(REQUEST)).toMatchObject({ ok: false, error: { code: "not_ready" } });
    expect(await openaiProvider(deps).complete({ ...REQUEST, model: "gpt-5" })).toEqual({ ok: true, value: "answer" });
    const body = JSON.parse(String(seen[0]!.init?.body));
    expect(body.messages).toEqual([{ role: "system", content: "SYSTEM" }, { role: "user", content: "PROMPT" }]);
  });

  it("turns a refused key into not_signed_in without keeping it, and a thrown fetch into not_ready", async () => {
    const { fetchStub } = stubFetch({ "/v1/models": () => jsonResponse({ error: { message: "bad key" } }, 401) });
    const deps = fakeDeps({ fetch: fetchStub });
    expect(await openaiProvider(deps).saveKey("sk-wrong-0123456789")).toMatchObject({ ok: false, error: { code: "not_signed_in" } });
    expect(await deps.secrets.get("provider-key:openai")).toBeNull();
    const down = fakeDeps({ fetch: async () => { throw new TypeError("fetch failed"); }, secrets: { "provider-key:openai": KEY } });
    expect(await openaiProvider(down).complete({ ...REQUEST, model: "gpt-5" })).toMatchObject({ ok: false, error: { code: "not_ready" } });
  });
});

describe("mistral provider", () => {
  const card = (id: string, completion_chat: boolean, deprecation: string | null = null) => ({ id, capabilities: { completion_chat }, deprecation });

  it("lists chat models that are not past their deprecation date, sorted, with a bearer header", async () => {
    const models = [card("mistral-embed", false), card("mistral-small-latest", true), card("open-mistral-7b", true, "2020-01-01T00:00:00Z"), card("mistral-large-latest", true, "2999-01-01T00:00:00Z")];
    const { fetchStub, seen } = stubFetch({ "/v1/models": () => jsonResponse({ object: "list", data: models }) });
    const deps = fakeDeps({ fetch: fetchStub, secrets: { "provider-key:mistral": KEY } });
    expect(await mistralProvider(deps).models()).toEqual({ ok: true, value: ["mistral-large-latest", "mistral-small-latest"] });
    expect((seen[0]!.init?.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`);
  });

  it("falls back to the current default model and reads chunked content", async () => {
    const { fetchStub, seen } = stubFetch({ "/v1/chat/completions": () => jsonResponse({ choices: [{ message: { content: [{ type: "text", text: " an" }, { type: "reference", reference_ids: [1] }, { type: "text", text: "swer " }] } }] }) });
    const deps = fakeDeps({ fetch: fetchStub, secrets: { "provider-key:mistral": KEY } });
    expect(await mistralProvider(deps).complete(REQUEST)).toEqual({ ok: true, value: "answer" });
    const body = JSON.parse(String(seen[0]!.init?.body));
    expect(body.model).toBe(DEFAULT_MISTRAL_MODEL);
    expect(body.messages).toEqual([{ role: "system", content: "SYSTEM" }, { role: "user", content: "PROMPT" }]);
  });

  it("refuses a bad key without keeping it, and quotes Mistral's top-level error message", async () => {
    const { fetchStub } = stubFetch({ "/v1/models": () => jsonResponse({ message: "Unauthorized", request_id: "r1" }, 401) });
    const deps = fakeDeps({ fetch: fetchStub });
    expect(await mistralProvider(deps).saveKey("mk-wrong-0123456789")).toMatchObject({ ok: false, error: { code: "not_signed_in" } });
    expect(await deps.secrets.get("provider-key:mistral")).toBeNull();
    const limited = fakeDeps({ fetch: stubFetch({ "/v1/chat/completions": () => jsonResponse({ message: "Requests rate limit exceeded" }, 429) }).fetchStub, secrets: { "provider-key:mistral": KEY } });
    expect(await mistralProvider(limited).complete(REQUEST)).toMatchObject({ ok: false, error: { code: "failed", message: expect.stringContaining("Requests rate limit exceeded") } });
  });
});
