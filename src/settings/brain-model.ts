import type { BrainStateDto } from "../../shared/api";
import { isKeyedProvider, PROVIDER_IDS, type ProviderId } from "../../shared/providers";

/** Providers Heel can run with no model chosen (the CLIs pick their own; Anthropic and Mistral have a current default). Ollama and OpenAI need a pick. */
const HAS_DEFAULT_MODEL: readonly ProviderId[] = ["claude", "codex", "anthropic", "mistral"];
const SEP = ":";

export type BrainOption = { value: string; label: string; disabled?: boolean };
export type BrainGroup = { id: ProviderId; label: string; ready: boolean; detail: string; options: BrainOption[] };

/** One selector value for a provider and its model (empty model = the provider's default). */
export const optionValue = (provider: ProviderId, model: string | null): string => `${provider}${SEP}${model ?? ""}`;

export function parseOption(value: string): { provider: ProviderId; model: string | null } | null {
  const at = value.indexOf(SEP);
  const provider = value.slice(0, at) as ProviderId;
  return at > 0 && PROVIDER_IDS.includes(provider) ? { provider, model: value.slice(at + 1) || null } : null;
}

function optionsOf(group: BrainStateDto["providers"][number], chosen: ProviderId | null, saved: string | null): BrainOption[] {
  if (!group.ready) {
    const keyed = isKeyedProvider(group.id);
    return [{ value: optionValue(group.id, null), label: keyed ? `${group.label} · Add API key…` : group.detail, disabled: !keyed }];
  }
  const options: BrainOption[] = [];
  // With a list to pick from, the default entry says so; without one (the CLIs) the provider's name is the whole entry.
  if (HAS_DEFAULT_MODEL.includes(group.id)) options.push({ value: optionValue(group.id, null), label: group.models.length ? `${group.label} · default model` : group.label });
  // A saved model the provider no longer reports (or a typed CLI model) stays visible, so the selector never shows nothing.
  if (chosen === group.id && saved && !group.models.includes(saved)) options.push({ value: optionValue(group.id, saved), label: `${group.label} · ${saved}` });
  for (const model of group.models) options.push({ value: optionValue(group.id, model), label: `${group.label} · ${model}` });
  if (options.length === 0) options.push({ value: optionValue(group.id, null), label: "No models reported yet", disabled: true });
  return options;
}

/** Missing-key entries open setup; unavailable subscriptions and local servers stay disabled. */
export function brainGroups(state: BrainStateDto): BrainGroup[] {
  const { provider, model } = state.settings;
  return state.providers.map((p) => ({ id: p.id, label: p.label, ready: p.ready, detail: p.detail, options: optionsOf(p, provider, model) }));
}

/** The optional free-text model for a chosen provider that reports no list (the CLIs); null hides the field. */
export function modelText(state: BrainStateDto): string | null {
  const chosen = state.providers.find((p) => p.id === state.settings.provider);
  return chosen?.ready && chosen.models.length === 0 ? (state.settings.model ?? "") : null;
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
