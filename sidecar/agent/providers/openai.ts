import { z } from "zod";
import { forgetKey, httpFailure, keyStatus, NO_KEY, readKey, saveKey, thrownFailure, withStop } from "./api-key";
import { DEFAULT_COMPLETE_TIMEOUT_MS, STATUS_TIMEOUT_MS, failResult, okResult, type CompleteRequest, type KeyedProvider, type ProviderDeps, type ProviderResult } from "./types";

const ID = "openai" as const;
const LABEL = "OpenAI (API key)";
const WHO = "OpenAI";
const BASE_URL = "https://api.openai.com/v1";
/** shortcut: the chat models are the gpt-* and o-series ids; refine when the list shows one that can't chat. */
const CHAT_MODEL = /^(gpt-|o\d)/;

const Models = z.object({ data: z.array(z.object({ id: z.string() })) });
const Completion = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string().nullable(), refusal: z.string().nullable().optional() }) })) });

const headers = (key: string) => ({ authorization: `Bearer ${key}`, "content-type": "application/json" });

async function listModels(deps: ProviderDeps, key: string): Promise<ProviderResult<string[]>> {
  try {
    const response = await deps.fetch(`${BASE_URL}/models`, { headers: headers(key), signal: AbortSignal.timeout(STATUS_TIMEOUT_MS) });
    if (!response.ok) return httpFailure(response, WHO);
    const parsed = Models.safeParse(await response.json());
    if (!parsed.success) return failResult("failed", "OpenAI sent a model list Heel couldn't read.");
    return okResult(parsed.data.data.map((m) => m.id).filter((id) => CHAT_MODEL.test(id)).sort());
  } catch (error) {
    return thrownFailure(error, WHO);
  }
}

function body(model: string, request: CompleteRequest): string {
  return JSON.stringify({ model, messages: [{ role: "system", content: request.system }, { role: "user", content: request.prompt }] });
}

async function complete(deps: ProviderDeps, request: CompleteRequest): Promise<ProviderResult<string>> {
  // OpenAI has no "current default" Heel can name without guessing: the model comes from its own list.
  if (!request.model) return failResult("not_ready", "Choose an OpenAI model in Settings › Brain first.");
  const key = await readKey(deps.secrets, ID);
  if (!key) return failResult("not_signed_in", NO_KEY);
  try {
    const response = await deps.fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: headers(key),
      body: body(request.model, request),
      signal: withStop(AbortSignal.timeout(request.timeoutMs ?? DEFAULT_COMPLETE_TIMEOUT_MS), request.signal),
    });
    if (!response.ok) return httpFailure(response, WHO);
    const parsed = Completion.safeParse(await response.json());
    const first = parsed.success ? parsed.data.choices[0] : undefined;
    if (!first) return failResult("failed", "OpenAI sent an answer Heel couldn't read.");
    if (first.message.refusal) return failResult("failed", `OpenAI declined: ${first.message.refusal}`);
    const text = first.message.content?.trim() ?? "";
    return text ? okResult(text) : failResult("empty", "OpenAI returned an empty answer. Try again.");
  } catch (error) {
    return thrownFailure(error, WHO, request.signal);
  }
}

/** OpenAI's chat API with the person's own key. The key lives in the Keychain and is sent only to api.openai.com. */
export function openaiProvider(deps: ProviderDeps): KeyedProvider {
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
