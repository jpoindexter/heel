import type { BrainStateDto } from "../../shared/api";
import type { ProviderId } from "../../shared/providers";

export type ProviderRow = {
  id: ProviderId;
  label: string;
  detail: string;
  ready: boolean;
  selected: boolean;
  /** Words as well as an icon, so state never depends on colour alone. */
  statusText: "Ready" | "Needs setup";
};

export function providerRows(state: BrainStateDto): ProviderRow[] {
  return state.providers.map((provider) => ({
    id: provider.id,
    label: provider.label,
    detail: provider.detail,
    ready: provider.ready,
    selected: state.settings.provider === provider.id,
    statusText: provider.ready ? "Ready" : "Needs setup",
  }));
}

export type ModelControl =
  | { kind: "none" }
  | { kind: "select"; options: string[]; value: string | null; required: boolean }
  | { kind: "text"; value: string };

/**
 * Local models must be picked from what Ollama reports. CLI providers report nothing, so the model
 * is optional free text (empty = the provider's default). A saved model that is no longer reported stays visible.
 */
export function modelControl(provider: ProviderId | null, models: string[] | null, current: string | null): ModelControl {
  if (!provider || models === null) return { kind: "none" };
  if (provider === "ollama" || models.length > 0) {
    const options = current && !models.includes(current) ? [current, ...models] : models;
    return { kind: "select", options, value: current, required: provider === "ollama" };
  }
  return { kind: "text", value: current ?? "" };
}

/** What a typed model name means on blur: the new name, null for "provider default", or undefined when nothing changed (so Tab through the field writes nothing). */
export function modelToCommit(draft: string, current: string): string | null | undefined {
  const next = draft.trim() || null;
  return next === (current.trim() || null) ? undefined : next;
}

export function labelFor(state: BrainStateDto, id: ProviderId | null): string {
  return state.providers.find((provider) => provider.id === id)?.label ?? "no provider";
}

/** Text for the Undo toast after a change. */
export function changeMessage(state: BrainStateDto, next: { provider: ProviderId | null; model: string | null }): string {
  if (state.settings.provider !== next.provider) return `Provider set to ${labelFor(state, next.provider)}.`;
  return next.model ? `Model set to ${next.model}.` : "Model set to the provider's default.";
}
