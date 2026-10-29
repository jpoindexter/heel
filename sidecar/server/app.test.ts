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
      ["mistral", false],
    ]);
    expect(result.data.providers.map((p) => p.models)).toEqual([[], [], ["qwen2.5:14b"], [], [], []]);
  });

  it("keeps a model list the provider can't give as empty, not as an error", async () => {
    const down = fakeProvider("ollama", {}, { ok: false, error: { code: "not_ready", message: "Ollama isn't running." } });
    const result = envelope(BrainStateSchema).parse(await setup({ ollama: down }).json("/brain"));
    expect(result.ok && result.data.providers.find((p) => p.id === "ollama")).toMatchObject({ ready: true, models: [] });
  });

  it("answers from the 30 s cache until ?fresh=1 (Check again)", async () => {
    let ready = true;
    const flaky: Provider = { ...fakeProvider("codex"), status: async () => ({ id: "codex", label: "Label codex", installed: true, ready, detail: ready ? "ChatGPT subscription" : "Signed out." }) };
    const { json } = setup({ codex: flaky });
    const codexReady = async (path: string) => {
      const result = envelope(BrainStateSchema).parse(await json(path));
      return result.ok && result.data.providers.find((p) => p.id === "codex")?.ready;
    };
    expect(await codexReady("/brain")).toBe(true);
    ready = false;
    expect(await codexReady("/brain")).toBe(true);
    expect(await codexReady("/brain?fresh=1")).toBe(false);
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

  it("confirms a ready provider with a real one-word completion, and passes a failed completion through", async () => {
    const { put, json } = setup();
    await put({ provider: "claude", model: null });
    expect(await json("/brain/test", { method: "POST" })).toMatchObject({ ok: true, data: { detail: expect.stringMatching(/^Label claude answered in \d+\.\d s\.$/) } });
    const mute = fakeProvider("claude", {}, { ok: true, value: [] }, { ok: false, error: { code: "failed", message: "Unknown model: sonnet-9." } });
    const broken = setup({ claude: mute });
    await broken.put({ provider: "claude", model: "sonnet-9" });
    expect(await broken.json("/brain/test", { method: "POST" })).toEqual({ ok: false, error: { code: "failed", message: "Unknown model: sonnet-9." } });
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
