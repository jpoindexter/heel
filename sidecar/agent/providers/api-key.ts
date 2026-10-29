import { z } from "zod";
import type { SecretStore } from "../../inbox/keychain";
import { failResult, okResult, type ProviderResult, type ProviderStatus } from "./types";

/* What the two API-key providers (Anthropic, OpenAI) share: where the key lives, how a key is checked and kept, how an HTTP failure reads. */

export const keyName = (id: string): string => `provider-key:${id}`;

export const NO_KEY = "No API key yet. Paste one in Settings › Brain.";

export async function readKey(secrets: SecretStore, id: string): Promise<string | null> {
  try {
    return await secrets.get(keyName(id));
  } catch {
    return null;
  }
}

/** Status without touching the network: a kept key is "ready"; a wrong key shows up when it is used. */
export function keyStatus(base: Pick<ProviderStatus, "id" | "label">, key: string | null): ProviderStatus {
  return key ? { ...base, installed: true, ready: true, detail: "API key in the Keychain" } : { ...base, installed: false, ready: false, detail: NO_KEY };
}

type SaveDeps = { secrets: SecretStore; id: string; base: Pick<ProviderStatus, "id" | "label">; check: (key: string) => Promise<ProviderResult<unknown>> };

/** The key is tried against the provider first; only a key that answers is kept. A refused key is never written. */
export async function saveKey({ secrets, id, base, check }: SaveDeps, key: string): Promise<ProviderResult<ProviderStatus>> {
  const tried = await check(key);
  if (!tried.ok) return tried;
  try {
    await secrets.set(keyName(id), key);
  } catch (error) {
    return failResult("failed", error instanceof Error ? error.message : "Couldn't save the key to the Keychain.");
  }
  return okResult(keyStatus(base, key));
}

export async function forgetKey(secrets: SecretStore, id: string, base: Pick<ProviderStatus, "id" | "label">): Promise<ProviderStatus> {
  try {
    await secrets.remove(keyName(id));
  } catch {
    /* already gone, or the Keychain refused: either way nothing usable is kept */
  }
  return keyStatus(base, null);
}

// OpenAI/Anthropic nest the message under error; Mistral puts it at the top.
const ErrorBody = z.object({ error: z.object({ message: z.string() }) }).or(z.object({ message: z.string() }).transform(({ message }) => ({ error: { message } })));

/** One sentence for a non-2xx answer: a refused key is its own case, the rest quote the provider's message. */
export async function httpFailure(response: Response, who: string): Promise<ProviderResult<never>> {
  if (response.status === 401 || response.status === 403) return failResult("not_signed_in", `${who} refused the API key. Check it and paste it again.`);
  const body = ErrorBody.safeParse(await response.json().catch(() => null));
  const detail = body.success ? body.data.error.message : `status ${response.status}`;
  if (response.status === 429) return failResult("failed", `${who} is rate-limiting this key: ${detail}`);
  return failResult("failed", `${who} answered: ${detail}`);
}

/** The timeout, plus the caller's stop signal when there is one. */
export const withStop = (timeout: AbortSignal, stop?: AbortSignal): AbortSignal => (stop ? AbortSignal.any([timeout, stop]) : timeout);

/** A thrown fetch, read as a result: stopped, timed out, or no network. */
export function thrownFailure(error: unknown, who: string, stop?: AbortSignal): ProviderResult<never> {
  if (stop?.aborted) return failResult("aborted", "Stopped.");
  const timedOut = error instanceof Error && error.name === "TimeoutError";
  return timedOut ? failResult("timeout", `${who} took too long. Try again.`) : failResult("not_ready", `Couldn't reach ${who}. Check the connection.`);
}
