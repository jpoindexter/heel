import { describe, expect, it } from "vitest";
import { BrainStateSchema, envelope } from "../../shared/api";
import type { Provider } from "../agent/providers/types";
import { DEV_ORIGIN } from "./app";
import { HOST, fakeProvider, setup } from "./test-app";

describe("guards", () => {
  it("rejects a request without the token", async () => {
    const { call } = setup();
    expect((await call("/health", { headers: { "x-heel-token": "" } })).status).toBe(401);
    expect((await call("/health", { headers: { "x-heel-token": "wrong-token-0123456789abcdef" } })).status).toBe(401);
  });

  it("rejects a non-loopback Host header (DNS rebinding)", async () => {
    const { call } = setup();
    expect((await call("/health", { headers: { host: "evil.example.com" } })).status).toBe(403);
    expect((await call("/health", { headers: { host: "localhost:1" } })).status).toBe(200);
  });

  it("answers a CORS preflight from the panel origin without a token, and not for other origins", async () => {
    const { app } = setup();
    const preflight = (origin: string) =>
      app.request("/brain", {
        method: "OPTIONS",
        headers: { host: HOST, origin, "access-control-request-method": "PUT", "access-control-request-headers": "x-heel-token,content-type" },
      });
    const allowed = await preflight(DEV_ORIGIN);
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(DEV_ORIGIN);
    expect((await preflight("https://evil.example.com")).headers.get("access-control-allow-origin")).toBeNull();
  });

  it("serves health with the token", async () => {
    expect(await setup().json("/health")).toEqual({ ok: true, data: { status: "ok" } });
  });
});

describe("GET /brain", () => {
  it("returns saved settings and every provider's status", async () => {
    // Parsing with the shared wire schema proves the server and the panel agree on the shape.
    const result = envelope(BrainStateSchema).parse(await setup().json("/brain"));
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.settings).toEqual({ provider: null, model: null });
    expect(result.data.providers.map((p) => [p.id, p.ready])).toEqual([
      ["claude", true],
      ["codex", false],
      ["ollama", true],
      ["anthropic", false],
      ["openai", false],
    ]);
  });
});

describe("GET /brain/models", () => {
  it("returns what the provider reports", async () => {
    expect(await setup().json("/brain/models?provider=ollama")).toEqual({ ok: true, data: { models: ["qwen2.5:14b"] } });
  });

  it("rejects an unknown provider and passes provider errors through", async () => {
    const down = fakeProvider("ollama", {}, { ok: false, error: { code: "not_ready", message: "Ollama isn't running." } });
    const { json } = setup({ ollama: down });
    expect(await json("/brain/models?provider=gpt")).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(await json("/brain/models?provider=ollama")).toEqual({ ok: false, error: { code: "not_ready", message: "Ollama isn't running." } });
  });
});

describe("PUT /brain", () => {
  it("saves a ready provider and model, and persists them", async () => {
    const { put, store } = setup();
    expect(await put({ provider: "ollama", model: "qwen2.5:14b" })).toEqual({ ok: true, data: { provider: "ollama", model: "qwen2.5:14b" } });
    expect(store.settings.getBrain()).toEqual({ provider: "ollama", model: "qwen2.5:14b" });
  });

  it("refuses a provider that isn't ready, says why, and saves nothing", async () => {
    const { put, store } = setup();
    expect(await put({ provider: "codex", model: null })).toEqual({
      ok: false,
      error: { code: "not_ready", message: "Not signed in. Run codex login in a terminal." },
    });
    expect(store.settings.getBrain()).toEqual({ provider: null, model: null });
  });

  it("allows clearing the provider", async () => {
    const { put } = setup();
    await put({ provider: "claude", model: null });
    expect(await put({ provider: null, model: null })).toEqual({ ok: true, data: { provider: null, model: null } });
  });

  it("rejects bad bodies with a sentence", async () => {
    const { put, call } = setup();
    expect(await put({ provider: "gpt-9000", model: null })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(await put({ provider: "claude", model: "  " })).toMatchObject({ ok: false, error: { code: "invalid" } });
    const malformed = await call("/brain", { method: "PUT", body: "{nope" });
    expect(await malformed.json()).toMatchObject({ ok: false, error: { code: "invalid" } });
  });
});

describe("POST /brain/test", () => {
  it("asks for a provider first", async () => {
    expect(await setup().json("/brain/test", { method: "POST" })).toEqual({ ok: false, error: { code: "not_ready", message: "Choose a provider first." } });
  });

  it("confirms a ready provider", async () => {
    const { put, json } = setup();
    await put({ provider: "claude", model: null });
    expect(await json("/brain/test", { method: "POST" })).toEqual({ ok: true, data: { detail: "Label claude is ready: claude detail." } });
  });

  it("needs a model for Ollama", async () => {
    const { put, json } = setup();
    await put({ provider: "ollama", model: null });
    expect(await json("/brain/test", { method: "POST" })).toEqual({ ok: false, error: { code: "not_ready", message: "Choose a local model first." } });
  });

  it("reports a provider that stopped being ready since it was chosen", async () => {
    let ready = true;
    const flaky: Provider = { ...fakeProvider("claude"), status: async () => ({ id: "claude", label: "Label claude", installed: true, ready, detail: "Signed out." }) };
    const { put, json } = setup({ claude: flaky });
    await put({ provider: "claude", model: null });
    ready = false;
    expect(await json("/brain/test", { method: "POST" })).toEqual({ ok: false, error: { code: "not_ready", message: "Signed out." } });
  });
});
