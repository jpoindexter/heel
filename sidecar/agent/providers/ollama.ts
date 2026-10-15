import { z } from "zod";
import {
  DEFAULT_COMPLETE_TIMEOUT_MS,
  STATUS_TIMEOUT_MS,
  failResult,
  okResult,
  type CompleteRequest,
  type Provider,
  type ProviderDeps,
  type ProviderResult,
  type ProviderStatus,
} from "./types";

const ID = "ollama" as const;
const LABEL = "Local (Ollama)";
const NOT_RUNNING = "Ollama isn't running. Start it with ollama serve, or open the Ollama app.";
const CHAT_CAPABILITY = "completion";

const Tags = z.object({ models: z.array(z.object({ name: z.string() })) });
const Show = z.object({ capabilities: z.array(z.string()).optional() });
const Chat = z.object({ message: z.object({ content: z.string() }) });
const ErrorBody = z.object({ error: z.string() });

type Deps = ProviderDeps;

/** Embedding-only models (e.g. nomic-embed-text) can't chat. Older servers report no capabilities: keep those. */
async function canChat(deps: Deps, name: string, timeoutMs: number): Promise<boolean> {
  try {
    const response = await deps.fetch(`${deps.ollamaUrl}/api/show`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: name }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return true;
    const parsed = Show.safeParse(await response.json());
    const capabilities = parsed.success ? parsed.data.capabilities : undefined;
    return !capabilities || capabilities.includes(CHAT_CAPABILITY);
  } catch {
    return true;
  }
}

async function listChatModels(deps: Deps, timeoutMs: number): Promise<ProviderResult<string[]>> {
  try {
    const response = await deps.fetch(`${deps.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return failResult("failed", `Ollama answered with status ${response.status}.`);
    const parsed = Tags.safeParse(await response.json());
    if (!parsed.success) return failResult("failed", "Ollama sent a model list Heel couldn't read.");
    const names = parsed.data.models.map((model) => model.name);
    const chatty = await Promise.all(names.map((name) => canChat(deps, name, timeoutMs)));
    return okResult(names.filter((_, index) => chatty[index]));
  } catch {
    return failResult("not_ready", NOT_RUNNING);
  }
}

async function status(deps: Deps): Promise<ProviderStatus> {
  const base = { id: ID, label: LABEL };
  const models = await listChatModels(deps, STATUS_TIMEOUT_MS);
  if (!models.ok) return { ...base, installed: false, ready: false, detail: models.error.message };
  if (models.value.length === 0) {
    return { ...base, installed: true, ready: false, detail: "No chat models yet. Run ollama pull with a model name." };
  }
  return { ...base, installed: true, ready: true, detail: `${models.value.length} local chat models` };
}

async function explain(response: Response, model: string): Promise<string> {
  const body = ErrorBody.safeParse(await response.json().catch(() => null));
  const detail = body.success ? body.data.error : `status ${response.status}`;
  return `Ollama couldn't use "${model}": ${detail}.`;
}

function chatBody(model: string, system: string, prompt: string): string {
  return JSON.stringify({
    model,
    stream: false,
    format: "json",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
}

async function complete(deps: Deps, request: CompleteRequest): Promise<ProviderResult<string>> {
  if (!request.model) return failResult("not_ready", "Choose a local model in Settings > Brain first.");
  try {
    const response = await deps.fetch(`${deps.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: chatBody(request.model, request.system, request.prompt),
      signal: AbortSignal.timeout(request.timeoutMs ?? DEFAULT_COMPLETE_TIMEOUT_MS),
    });
    if (!response.ok) return failResult("failed", await explain(response, request.model));
    const parsed = Chat.safeParse(await response.json());
    if (!parsed.success) return failResult("failed", "Ollama sent an answer Heel couldn't read.");
    const content = parsed.data.message.content.trim();
    return content ? okResult(content) : failResult("empty", "The local model returned an empty answer. Try again.");
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return timedOut ? failResult("timeout", "The local model took too long. Try a smaller model.") : failResult("not_ready", NOT_RUNNING);
  }
}

/** Local models through Ollama's HTTP API. Nothing leaves the machine. */
export function ollamaProvider(deps: Deps): Provider {
  return {
    id: ID,
    label: LABEL,
    status: () => status(deps),
    models: () => listChatModels(deps, STATUS_TIMEOUT_MS),
    complete: (request) => complete(deps, request),
  };
}
