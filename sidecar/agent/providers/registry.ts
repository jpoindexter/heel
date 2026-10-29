import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { macKeychain } from "../../inbox/keychain";
import { PROVIDER_IDS } from "../../store/settings";
import { anthropicProvider } from "./anthropic";
import { claudeProvider } from "./claude";
import { codexProvider } from "./codex";
import { findExecutable } from "./find-executable";
import { ollamaProvider } from "./ollama";
import { mistralProvider } from "./mistral";
import { openaiProvider } from "./openai";
import { runCommand } from "./process";
import type { Provider, ProviderDeps, ProviderId, ProviderStatus } from "./types";

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";

export function defaultDeps(): ProviderDeps {
  const workdir = join(tmpdir(), "heel-agent");
  mkdirSync(workdir, { recursive: true });
  return {
    run: runCommand,
    find: (name) => findExecutable(name),
    fetch,
    workdir,
    ollamaUrl: process.env.HEEL_OLLAMA_URL ?? DEFAULT_OLLAMA_URL,
    secrets: macKeychain(runCommand),
  };
}

export function createProviders(deps: ProviderDeps = defaultDeps()): Record<ProviderId, Provider> {
  return { claude: claudeProvider(deps), codex: codexProvider(deps), ollama: ollamaProvider(deps), anthropic: anthropicProvider(deps), openai: openaiProvider(deps), mistral: mistralProvider(deps) };
}

/** A provider's status plus, when it is ready, the models it reports: Settings › Brain lists them in one selector. */
export type ProviderCard = ProviderStatus & { models: string[] };

export async function withModels(provider: Provider, status: ProviderStatus): Promise<ProviderCard> {
  const models = status.ready ? await provider.models() : null;
  return { ...status, models: models?.ok ? models.value : [] };
}

/** Every provider's card, for Settings › Brain. */
export function detectAll(providers: Record<ProviderId, Provider>): Promise<ProviderCard[]> {
  return Promise.all(PROVIDER_IDS.map(async (id) => withModels(providers[id], await providers[id].status())));
}

export const STATUS_KEEP_MS = 30_000;

/**
 * detectAll, with one answer kept for STATUS_KEEP_MS: every Settings open asks, and each ask spawns the
 * claude and codex CLIs (V1-10). `forget` after a sign-in test or a provider change so the next ask is fresh.
 */
export function cachedDetectAll(providers: Record<ProviderId, Provider>, now: () => number = Date.now) {
  let kept: { at: number; value: Promise<ProviderCard[]> } | null = null;
  return {
    all: (): Promise<ProviderCard[]> => {
      if (!kept || now() - kept.at >= STATUS_KEEP_MS) kept = { at: now(), value: detectAll(providers) };
      return kept.value;
    },
    forget: (): void => void (kept = null),
  };
}
