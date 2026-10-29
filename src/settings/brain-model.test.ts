import { describe, expect, it } from "vitest";
import type { BrainStateDto } from "../../shared/api";
import { brainGroups, changeMessage, modelText, modelToCommit, optionValue, parseOption } from "./brain-model";

describe("modelToCommit", () => {
  it("writes nothing when the field is left as it was (empty stays the default, a name stays itself)", () => {
    expect(modelToCommit("", "")).toBeUndefined();
    expect(modelToCommit(" sonnet ", "sonnet")).toBeUndefined();
  });
  it("writes the new name, or null to go back to the provider's default", () => {
    expect(modelToCommit("opus", "sonnet")).toBe("opus");
    expect(modelToCommit("  ", "sonnet")).toBeNull();
  });
});

const state = (provider: BrainStateDto["settings"]["provider"], model: string | null = null): BrainStateDto => ({
  settings: { provider, model },
  providers: [
    { id: "claude", label: "Claude (subscription)", installed: true, ready: true, detail: "max subscription", models: [] },
    { id: "codex", label: "Codex (subscription)", installed: true, ready: false, detail: "Not signed in. Run codex login in a terminal.", models: [] },
    { id: "ollama", label: "Local (Ollama)", installed: true, ready: true, detail: "2 local chat models", models: ["qwen2.5:14b", "llama3:8b"] },
    { id: "openai", label: "OpenAI (API key)", installed: true, ready: true, detail: "API key in the Keychain", models: [] },
  ],
});

describe("brainGroups", () => {
  it("gives a CLI provider its default entry, a local provider its models only, and keeps a provider that needs setup listed but disabled", () => {
    const groups = brainGroups(state("claude"));
    expect(groups.map((g) => [g.id, g.ready, g.options.map((o) => [o.label, o.disabled ?? false])])).toEqual([
      ["claude", true, [["Claude (subscription)", false]]],
      ["codex", false, [["Not signed in. Run codex login in a terminal.", true]]],
      ["ollama", true, [["Local (Ollama) · qwen2.5:14b", false], ["Local (Ollama) · llama3:8b", false]]],
      ["openai", true, [["No models reported yet", true]]],
    ]);
  });

  it("keeps the saved model visible when the provider no longer reports it, or when it was typed for a CLI", () => {
    const ollama = brainGroups(state("ollama", "gone:1b"))[2]!;
    expect(ollama.options[0]).toEqual({ value: optionValue("ollama", "gone:1b"), label: "Local (Ollama) · gone:1b" });
    const claude = brainGroups(state("claude", "sonnet"))[0]!;
    expect(claude.options.map((o) => o.label)).toEqual(["Claude (subscription)", "Claude (subscription) · sonnet"]);
  });
});

describe("optionValue and parseOption", () => {
  it("round-trips a provider with and without a model, and rejects anything else", () => {
    expect(parseOption(optionValue("ollama", "qwen2.5:14b"))).toEqual({ provider: "ollama", model: "qwen2.5:14b" });
    expect(parseOption(optionValue("claude", null))).toEqual({ provider: "claude", model: null });
    expect(parseOption("gpt:x")).toBeNull();
    expect(parseOption("")).toBeNull();
  });
});

describe("modelText", () => {
  it("offers free text only for a ready provider that reports no models", () => {
    expect(modelText(state("claude", "sonnet"))).toBe("sonnet");
    expect(modelText(state("claude"))).toBe("");
    expect(modelText(state("ollama"))).toBeNull();
    expect(modelText(state("codex"))).toBeNull();
    expect(modelText(state(null))).toBeNull();
  });
});

describe("changeMessage", () => {
  it("names the new provider when the provider changed", () => {
    expect(changeMessage(state(null), { provider: "codex", model: null })).toBe("Provider set to Codex (subscription).");
  });

  it("names the model, or the default, when only the model changed", () => {
    expect(changeMessage(state("claude"), { provider: "claude", model: "sonnet" })).toBe("Model set to sonnet.");
    expect(changeMessage(state("claude", "sonnet"), { provider: "claude", model: null })).toBe("Model set to the provider's default.");
  });
});
