import { describe, expect, it } from "vitest";
import { BrainStateSchema, envelope } from "../../shared/api";
import { anthropicProvider } from "../agent/providers/anthropic";
import { fakeDeps, jsonResponse } from "../agent/providers/test-deps";
import { setup } from "./test-app";

const KEY = "sk-ant-test-0123456789";
const models = () => jsonResponse({ data: [{ id: "claude-opus-5-5", lifecycle: "active" }] });

describe("PUT /brain/key and POST /brain/key/forget", () => {
  it("keeps a key the provider accepts, reports it ready, lists its models, and never echoes the key", async () => {
    const deps = fakeDeps({ fetch: async () => models() });
    const { send, json } = setup({ anthropic: anthropicProvider(deps) });
    const saved = await send("PUT", "/brain/key", { provider: "anthropic", key: KEY });
    expect(saved).toMatchObject({ ok: true, data: { id: "anthropic", ready: true, models: ["claude-opus-5-5"] } });
    expect(JSON.stringify(saved)).not.toContain(KEY);
    const brain = envelope(BrainStateSchema).parse(await json("/brain"));
    expect(brain.ok && brain.data.providers.find((p) => p.id === "anthropic")?.ready).toBe(true);
    const forgotten = await send("POST", "/brain/key/forget", { provider: "anthropic" });
    expect(forgotten).toMatchObject({ ok: true, data: { ready: false, models: [] } });
    expect(await deps.secrets.get("provider-key:anthropic")).toBeNull();
  });

  it("refuses a short key, a provider without keys, and a key the provider rejects", async () => {
    const deps = fakeDeps({ fetch: async () => jsonResponse({ error: { message: "nope" } }, 401) });
    const { send } = setup({ anthropic: anthropicProvider(deps) });
    expect(await send("PUT", "/brain/key", { provider: "anthropic", key: "short" })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(await send("PUT", "/brain/key", { provider: "ollama", key: KEY })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(await send("PUT", "/brain/key", { provider: "anthropic", key: KEY })).toMatchObject({ ok: false, error: { code: "not_signed_in" } });
    expect(await deps.secrets.get("provider-key:anthropic")).toBeNull();
  });
});
