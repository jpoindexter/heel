import { describe, expect, it } from "vitest";
import { cachedDetectAll, STATUS_KEEP_MS } from "./registry";
import type { Provider, ProviderId } from "./types";

function counting(id: ProviderId, calls: Record<string, number>): Provider {
  return {
    id,
    label: id,
    status: async () => ((calls[id] = (calls[id] ?? 0) + 1), { id, label: id, installed: true, ready: true, detail: "" }),
    models: async () => ({ ok: true, value: [] }),
    complete: async () => ({ ok: true, value: "" }),
  };
}

describe("cachedDetectAll", () => {
  it("asks each provider once within the keep window, again after it, and at once after forget", async () => {
    const calls: Record<string, number> = {};
    let t = 0;
    const providers = { claude: counting("claude", calls), codex: counting("codex", calls), ollama: counting("ollama", calls), anthropic: counting("anthropic", calls), openai: counting("openai", calls) };
    const statuses = cachedDetectAll(providers, () => t);

    await statuses.all();
    t = STATUS_KEEP_MS - 1;
    await statuses.all();
    expect(calls).toEqual({ claude: 1, codex: 1, ollama: 1, anthropic: 1, openai: 1 });

    t = STATUS_KEEP_MS;
    await statuses.all();
    expect(calls.claude).toBe(2);

    statuses.forget();
    await statuses.all();
    expect(calls.claude).toBe(3);
  });
});
