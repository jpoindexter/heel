import { describe, expect, it } from "vitest";
import type { BrainStateDto } from "../../shared/api";
import { summarizeBrain } from "./brain-summary";

const state = (provider: BrainStateDto["settings"]["provider"], model: string | null, ready = true): BrainStateDto => ({
  settings: { provider, model },
  providers: [
    { id: "claude", label: "Claude", installed: true, ready, detail: ready ? "Signed in" : "Run claude to sign in" },
    { id: "ollama", label: "Local (Ollama)", installed: true, ready: true, detail: "Running" },
  ],
});

describe("summarizeBrain", () => {
  it("asks for setup when no provider is chosen", () => {
    expect(summarizeBrain(state(null, null))).toMatchObject({ kind: "setup", reason: "none", label: "Choose AI" });
  });

  it("asks for setup and says why when the chosen provider isn't ready", () => {
    expect(summarizeBrain(state("claude", null, false))).toMatchObject({ kind: "setup", reason: "not_ready", detail: "Run claude to sign in" });
  });

  it("labels a ready provider, with the pinned model when there is one", () => {
    expect(summarizeBrain(state("claude", null))).toMatchObject({ kind: "ready", label: "Claude" });
    expect(summarizeBrain(state("ollama", "llama3.2"))).toMatchObject({ kind: "ready", label: "Local (Ollama) · llama3.2" });
  });
});
