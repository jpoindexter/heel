import { z } from "zod";
import { forgetKey, httpFailure, keyStatus, NO_KEY, readKey, saveKey, thrownFailure, withStop } from "./api-key";
import { DEFAULT_COMPLETE_TIMEOUT_MS, STATUS_TIMEOUT_MS, failResult, okResult, type CompleteRequest, type KeyedProvider, type ProviderDeps, type ProviderResult } from "./types";

const ID = "anthropic" as const;
const LABEL = "Claude (API key)";
const WHO = "Anthropic";
const BASE_URL = "https://api.anthropic.com/v1";
/** The API version this adapter was written against (platform.claude.com/docs/en/api/versioning). */
const API_VERSION = "2026-10-21";
/** When no model is chosen: Anthropic's current default (claude-api skill, 2026-10). */
const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_TOKENS = 16_000;
const MODELS_PAGE = 100;

const Models = z.object({ data: z.array(z.object({ id: z.string(), lifecycle: z.string().optional() })) });
const Message = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  stop_reason: z.string().nullable(),
  stop_details: z.object({ explanation: z.string().nullable().optional() }).nullable().optional(),
});

const headers = (key: string) => ({ "x-api-key": key, "anthropic-version": API_VERSION, "content-type": "application/json" });

async function listModels(deps: ProviderDeps, key: string): Promise<ProviderResult<string[]>> {
  try {
    const response = await deps.fetch(`${BASE_URL}/models?limit=${MODELS_PAGE}`, { headers: headers(key), signal: AbortSignal.timeout(STATUS_TIMEOUT_MS) });
    if (!response.ok) return httpFailure(response, WHO);
    const parsed = Models.safeParse(await response.json());
    if (!parsed.success) return failResult("failed", "Anthropic sent a model list Heel couldn't read.");
    return okResult(parsed.data.data.filter((m) => m.lifecycle !== "retired").map((m) => m.id));
  } catch (error) {
    return thrownFailure(error, WHO);
  }
}

function body(request: CompleteRequest): string {
  return JSON.stringify({ model: request.model ?? DEFAULT_MODEL, max_tokens: MAX_TOKENS, system: request.system, messages: [{ role: "user", content: request.prompt }] });
}

async function complete(deps: ProviderDeps, request: CompleteRequest): Promise<ProviderResult<string>> {
  const key = await readKey(deps.secrets, ID);
  if (!key) return failResult("not_signed_in", NO_KEY);
  try {
    const response = await deps.fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: headers(key),
      body: body(request),
      signal: withStop(AbortSignal.timeout(request.timeoutMs ?? DEFAULT_COMPLETE_TIMEOUT_MS), request.signal),
    });
    if (!response.ok) return httpFailure(response, WHO);
    const parsed = Message.safeParse(await response.json());
    if (!parsed.success) return failResult("failed", "Anthropic sent an answer Heel couldn't read.");
    if (parsed.data.stop_reason === "refusal") return failResult("failed", `Claude declined: ${parsed.data.stop_details?.explanation ?? "no reason given"}.`);
    const text = parsed.data.content.filter((block) => block.type === "text").map((block) => block.text ?? "").join("").trim();
    return text ? okResult(text) : failResult("empty", "Claude returned an empty answer. Try again.");
  } catch (error) {
    return thrownFailure(error, WHO, request.signal);
  }
}

/** Claude through Anthropic's API with the person's own key. The key lives in the Keychain and is sent only to api.anthropic.com. */
export function anthropicProvider(deps: ProviderDeps): KeyedProvider {
  const base = { id: ID, label: LABEL };
  return {
    ...base,
    status: async () => keyStatus(base, await readKey(deps.secrets, ID)),
    models: async () => {
      const key = await readKey(deps.secrets, ID);
      return key ? listModels(deps, key) : failResult("not_signed_in", NO_KEY);
    },
    complete: (request) => complete(deps, request),
    saveKey: (key) => saveKey({ secrets: deps.secrets, id: ID, base, check: (candidate) => listModels(deps, candidate) }, key),
    forgetKey: () => forgetKey(deps.secrets, ID, base),
  };
}
