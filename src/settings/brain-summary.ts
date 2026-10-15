import type { BrainStateDto } from "../../shared/api";

export type BrainSummary =
  /** No provider chosen, or the chosen one isn't ready: the first-run step shows instead of a dead box. */
  | { kind: "setup"; reason: "none" | "not_ready"; label: string; detail: string }
  | { kind: "ready"; label: string; detail: string };

/** One short label for the header chip: who answers, and which model if one is pinned. */
export function summarizeBrain(state: BrainStateDto): BrainSummary {
  const { provider, model } = state.settings;
  if (!provider) return { kind: "setup", reason: "none", label: "Choose AI", detail: "Pick the AI Heel uses." };
  const status = state.providers.find((p) => p.id === provider);
  const name = status?.label ?? provider;
  const label = model ? `${name} · ${model}` : name;
  if (!status?.ready) return { kind: "setup", reason: "not_ready", label, detail: status?.detail ?? `${name} isn't ready.` };
  return { kind: "ready", label, detail: `Answers come from ${label}.` };
}
