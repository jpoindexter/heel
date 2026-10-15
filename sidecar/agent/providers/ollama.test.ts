import { describe, expect, it } from "vitest";
import { ollamaProvider } from "./ollama";
import { fakeDeps, jsonResponse } from "./test-deps";

const REQUEST = { system: "SYSTEM", prompt: "PROMPT", model: "gemma3:latest" };

const refused: typeof fetch = async () => {
  throw new TypeError("fetch failed");
};

describe("ollama provider", () => {
  it("is ready and counts models when the server answers", async () => {
    const fetchStub: typeof fetch = async () => jsonResponse({ models: [{ name: "gemma3:latest" }, { name: "qwen2.5:latest" }] });
    const provider = ollamaProvider(fakeDeps({ fetch: fetchStub }));
    expect(await provider.status()).toMatchObject({ ready: true, detail: "2 local chat models" });
    expect(await provider.models()).toEqual({ ok: true, value: ["gemma3:latest", "qwen2.5:latest"] });
  });

  it("drops embedding-only models so Settings never offers one that can't chat", async () => {
    const fetchStub: typeof fetch = async (url, init) => {
      if (String(url).endsWith("/api/tags")) {
        return jsonResponse({ models: [{ name: "nomic-embed-text:latest" }, { name: "qwen2.5:14b" }] });
      }
      const { model } = JSON.parse(String(init?.body));
      return jsonResponse({ capabilities: model.startsWith("nomic") ? ["embedding"] : ["completion", "tools"] });
    };
    const provider = ollamaProvider(fakeDeps({ fetch: fetchStub }));
    expect(await provider.models()).toEqual({ ok: true, value: ["qwen2.5:14b"] });
  });

  it("says there are no chat models when only embedding models are installed", async () => {
    const fetchStub: typeof fetch = async (url) =>
      String(url).endsWith("/api/tags")
        ? jsonResponse({ models: [{ name: "nomic-embed-text:latest" }] })
        : jsonResponse({ capabilities: ["embedding"] });
    const status = await ollamaProvider(fakeDeps({ fetch: fetchStub })).status();
    expect(status).toMatchObject({ installed: true, ready: false });
    expect(status.detail).toContain("No chat models");
  });

  it("keeps a model when the server reports no capabilities (older Ollama)", async () => {
    const fetchStub: typeof fetch = async (url) =>
      String(url).endsWith("/api/tags") ? jsonResponse({ models: [{ name: "old:latest" }] }) : jsonResponse({});
    expect(await ollamaProvider(fakeDeps({ fetch: fetchStub })).models()).toEqual({ ok: true, value: ["old:latest"] });
  });

  it("says Ollama isn't running when the connection is refused", async () => {
    const status = await ollamaProvider(fakeDeps({ fetch: refused })).status();
    expect(status.ready).toBe(false);
    expect(status.detail).toContain("ollama serve");
  });

  it("is not ready with zero models and tells you to pull one", async () => {
    const provider = ollamaProvider(fakeDeps({ fetch: async () => jsonResponse({ models: [] }) }));
    expect(await provider.status()).toMatchObject({ installed: true, ready: false });
  });

  it("refuses to complete without a chosen model", async () => {
    const result = await ollamaProvider(fakeDeps()).complete({ ...REQUEST, model: null });
    expect(result).toMatchObject({ ok: false, error: { code: "not_ready" } });
  });

  it("posts a non-streaming JSON-format chat and returns the content", async () => {
    let body: Record<string, unknown> = {};
    const fetchStub: typeof fetch = async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return jsonResponse({ message: { content: ' {"say":"hi","actions":[]} ' } });
    };
    const result = await ollamaProvider(fakeDeps({ fetch: fetchStub })).complete(REQUEST);
    expect(result).toEqual({ ok: true, value: '{"say":"hi","actions":[]}' });
    expect(body).toMatchObject({ model: "gemma3:latest", stream: false, format: "json" });
    expect(body.messages).toEqual([
      { role: "system", content: "SYSTEM" },
      { role: "user", content: "PROMPT" },
    ]);
  });

  it("names the model and shows what Ollama actually said when it rejects the request", async () => {
    const provider = ollamaProvider(fakeDeps({ fetch: async () => jsonResponse({ error: "does not support chat" }, 400) }));
    const result = await provider.complete(REQUEST);
    expect(result).toEqual({
      ok: false,
      error: { code: "failed", message: 'Ollama couldn\'t use "gemma3:latest": does not support chat.' },
    });
  });

  it("falls back to the status code when the error body isn't JSON", async () => {
    const provider = ollamaProvider(fakeDeps({ fetch: async () => new Response("boom", { status: 500 }) }));
    const result = await provider.complete(REQUEST);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("status 500");
  });

  it("maps a timeout and an empty answer", async () => {
    const slow: typeof fetch = async () => {
      throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
    };
    expect(await ollamaProvider(fakeDeps({ fetch: slow })).complete(REQUEST)).toMatchObject({ ok: false, error: { code: "timeout" } });
    const empty = ollamaProvider(fakeDeps({ fetch: async () => jsonResponse({ message: { content: "  " } }) }));
    expect(await empty.complete(REQUEST)).toMatchObject({ ok: false, error: { code: "empty" } });
  });
});

describe("ollama complete when stopped", () => {
  it("returns aborted instead of 'not running' when the caller stops the request", async () => {
    const stop = new AbortController();
    const fetching = (async (_url: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as typeof fetch;
    const provider = ollamaProvider(fakeDeps({ fetch: fetching }));
    const pending = provider.complete({ system: "s", prompt: "p", model: "llama", signal: stop.signal });
    stop.abort();
    expect(await pending).toEqual({ ok: false, error: { code: "aborted", message: "Stopped." } });
  });
});
