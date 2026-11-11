import { imageDataUrl } from "./image";
import { z } from "zod";
import { forgetKey, httpFailure, keyStatus, NO_KEY, readKey, saveKey, thrownFailure, withStop } from "./api-key";
import { DEFAULT_COMPLETE_TIMEOUT_MS, STATUS_TIMEOUT_MS, failResult, okResult, type CompleteRequest, type KeyedProvider, type ProviderDeps, type ProviderResult } from "./types";

const ID = "mistral" as const;
const LABEL = "Mistral (API key)";
const WHO = "Mistral";
const BASE_URL = "https://api.mistral.ai/v1";
/** The alias Mistral's own docs use as the example model (docs.mistral.ai/openapi.yaml, 2026-10-29); it always resolves. */
export const DEFAULT_MISTRAL_MODEL = "mistral-large-latest";

// Shapes from docs.mistral.ai/openapi.yaml: ModelList → BaseModelCard (capabilities.completion_chat, deprecation date-time|null); AssistantMessage.content is text, null, or chunks.
const Models = z.object({
  data: z.array(z.object({ id: z.string(), capabilities: z.object({ completion_chat: z.boolean().default(false) }).optional(), deprecation: z.string().nullable().optional() })),
});
const Chunk = z.object({ type: z.string(), text: z.string().optional() });
const Completion = z.object({ choices: z.array(z.object({ message: z.object({ content: z.union([z.string(), z.array(Chunk)]).nullable() }) })) });

const headers = (key: string) => ({ authorization: `Bearer ${key}`, "content-type": "application/json" });

/** Chat-capable and not yet past its deprecation date. */
function usable(model: z.infer<typeof Models>["data"][number], now: number): boolean {
  if (!model.capabilities?.completion_chat) return false;
  return !model.deprecation || new Date(model.deprecation).getTime() > now;
}

async function listModels(deps: ProviderDeps, key: string): Promise<ProviderResult<string[]>> {
  try {
    const response = await deps.fetch(`${BASE_URL}/models`, { headers: headers(key), signal: AbortSignal.timeout(STATUS_TIMEOUT_MS) });
    if (!response.ok) return httpFailure(response, WHO);
    const parsed = Models.safeParse(await response.json());
    if (!parsed.success) return failResult("failed", "Mistral sent a model list Heel couldn't read.");
    const now = Date.now();
    return okResult(parsed.data.data.filter((m) => usable(m, now)).map((m) => m.id).sort());
  } catch (error) {
    return thrownFailure(error, WHO);
  }
}

function body(model: string, request: CompleteRequest): string {
  return JSON.stringify({ model, messages: [{ role: "system", content: request.system }, { role: "user", content: request.image ? [{ type: "image_url", image_url: imageDataUrl(request.image) }, { type: "text", text: request.prompt }] : request.prompt }] });
}

const textOf = (content: string | { type: string; text?: string }[] | null): string =>
  (typeof content === "string" ? content : (content ?? []).map((chunk) => (chunk.type === "text" ? (chunk.text ?? "") : "")).join("")).trim();

async function complete(deps: ProviderDeps, request: CompleteRequest): Promise<ProviderResult<string>> {
  const key = await readKey(deps.secrets, ID);
  if (!key) return failResult("not_signed_in", NO_KEY);
  try {
    const response = await deps.fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: headers(key),
      body: body(request.model ?? DEFAULT_MISTRAL_MODEL, request),
      signal: withStop(AbortSignal.timeout(request.timeoutMs ?? DEFAULT_COMPLETE_TIMEOUT_MS), request.signal),
    });
    if (!response.ok) return httpFailure(response, WHO);
    const parsed = Completion.safeParse(await response.json());
    const first = parsed.success ? parsed.data.choices[0] : undefined;
    if (!first) return failResult("failed", "Mistral sent an answer Heel couldn't read.");
    const text = textOf(first.message.content);
    return text ? okResult(text) : failResult("empty", "Mistral returned an empty answer. Try again.");
  } catch (error) {
    return thrownFailure(error, WHO, request.signal);
  }
}

/** Mistral's chat API with the person's own key. The key lives in the Keychain and is sent only to api.mistral.ai. */
export function mistralProvider(deps: ProviderDeps): KeyedProvider {
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
