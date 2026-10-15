import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROVIDER_IDS } from "../../store/settings";
import { claudeProvider } from "./claude";
import { codexProvider } from "./codex";
import { findExecutable } from "./find-executable";
import { ollamaProvider } from "./ollama";
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
  };
}

export function createProviders(deps: ProviderDeps = defaultDeps()): Record<ProviderId, Provider> {
  return { claude: claudeProvider(deps), codex: codexProvider(deps), ollama: ollamaProvider(deps) };
}

/** Status of every provider, for Settings > Brain. */
export function detectAll(providers: Record<ProviderId, Provider>): Promise<ProviderStatus[]> {
  return Promise.all(PROVIDER_IDS.map((id) => providers[id].status()));
}
