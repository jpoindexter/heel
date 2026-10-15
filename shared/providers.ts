export const PROVIDER_IDS = ["claude", "codex", "ollama"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];
