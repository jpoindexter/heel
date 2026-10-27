import { describe, expect, it } from "vitest";
import type { BrainStateDto } from "../../shared/api";
import { changeMessage, modelControl, modelToCommit, providerRows } from "./brain-model";

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
    { id: "claude", label: "Claude (subscription)", installed: true, ready: true, detail: "max subscription" },
    { id: "codex", label: "Codex (subscription)", installed: true, ready: false, detail: "Not signed in. Run codex login in a terminal." },
    { id: "ollama", label: "Local (Ollama)", installed: true, ready: true, detail: "3 local chat models" },
  ],
});

describe("providerRows", () => {
  it("marks the selected provider and says Ready or Needs setup in words", () => {
    const rows = providerRows(state("claude"));
    expect(rows.map((r) => [r.id, r.selected, r.statusText])).toEqual([
      ["claude", true, "Ready"],
      ["codex", false, "Needs setup"],
      ["ollama", false, "Ready"],
    ]);
  });

  it("keeps the fix instruction for a provider that needs setup", () => {
    expect(providerRows(state(null))[1]?.detail).toContain("codex login");
  });
});

describe("modelControl", () => {
  it("shows nothing until a provider is chosen and its models are known", () => {
    expect(modelControl(null, [], null)).toEqual({ kind: "none" });
    expect(modelControl("claude", null, null)).toEqual({ kind: "none" });
  });

  it("makes the CLI providers' model optional free text", () => {
    expect(modelControl("codex", [], null)).toEqual({ kind: "text", value: "" });
    expect(modelControl("claude", [], "sonnet")).toEqual({ kind: "text", value: "sonnet" });
  });

  it("requires a pick from the reported list for Ollama", () => {
    expect(modelControl("ollama", ["qwen2.5:14b"], null)).toEqual({ kind: "select", options: ["qwen2.5:14b"], value: null, required: true });
  });

  it("keeps a saved model visible even if the provider no longer reports it", () => {
    const control = modelControl("ollama", ["qwen2.5:14b"], "gone:1b");
    expect(control).toMatchObject({ kind: "select", options: ["gone:1b", "qwen2.5:14b"], value: "gone:1b" });
  });

  it("offers a select when a CLI provider does report models, with the default allowed", () => {
    expect(modelControl("claude", ["a", "b"], null)).toMatchObject({ kind: "select", required: false });
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
