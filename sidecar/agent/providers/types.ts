import type { ProviderId } from "../../store/settings";
import type { FindExecutable } from "./find-executable";
import type { RunCommand } from "./process";

export type { ProviderId };

export type ProviderStatus = {
  id: ProviderId;
  label: string;
  installed: boolean;
  ready: boolean;
  /** One plain sentence for the Settings screen, e.g. "ChatGPT subscription" or "Not signed in. Run codex login." */
  detail: string;
};

export type ProviderErrorCode = "not_installed" | "not_signed_in" | "not_ready" | "timeout" | "failed" | "empty" | "aborted";

export type ProviderError = { code: ProviderErrorCode; message: string };

export type ProviderResult<T> = { ok: true; value: T } | { ok: false; error: ProviderError };

export type CompleteRequest = {
  system: string;
  prompt: string;
  /** null = let the provider choose its default model. */
  model: string | null;
  timeoutMs?: number;
  /** Aborting it stops the work (kills the CLI, drops the HTTP request) and the result is an "aborted" error. */
  signal?: AbortSignal;
};

export interface Provider {
  id: ProviderId;
  label: string;
  status(): Promise<ProviderStatus>;
  /** Models the provider itself reports. Empty means "provider picks; free text is fine". Never a hardcoded list. */
  models(): Promise<ProviderResult<string[]>>;
  complete(request: CompleteRequest): Promise<ProviderResult<string>>;
}

export type ProviderDeps = {
  run: RunCommand;
  find: FindExecutable;
  fetch: typeof fetch;
  /** Empty scratch directory so CLIs never read project files. */
  workdir: string;
  ollamaUrl: string;
};

export const DEFAULT_COMPLETE_TIMEOUT_MS = 90_000;
export const STATUS_TIMEOUT_MS = 8_000;

export const okResult = <T>(value: T): ProviderResult<T> => ({ ok: true, value });
export const failResult = (code: ProviderErrorCode, message: string): ProviderResult<never> => ({
  ok: false,
  error: { code, message },
});
