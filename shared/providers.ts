export const PROVIDER_IDS = ["claude", "codex", "ollama", "anthropic", "openai", "mistral"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

/** Providers that take an API key (kept in the macOS Keychain) rather than a CLI sign-in or a local server (V1-9). */
export const KEYED_PROVIDER_IDS = ["anthropic", "openai", "mistral"] as const;

export type KeyedProviderId = (typeof KEYED_PROVIDER_IDS)[number];

export const isKeyedProvider = (id: string): id is KeyedProviderId => (KEYED_PROVIDER_IDS as readonly string[]).includes(id);
