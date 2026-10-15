import type { HistoryMessage } from "../../shared/api";
import type { Store } from "../store/store";
import { parseAgentReply } from "./actions";
import { executeActions, type ActionOutcome } from "./execute";
import { buildSnapshot, buildSystemPrompt, buildUserPrompt, loadSkill, selectSkills, type SkillLoader } from "./prompt";
import type { Provider, ProviderErrorCode, ProviderId } from "./providers/types";

export const MAX_USER_CHARS = 4_000;
const MAX_ATTEMPTS = 2; // one retry with the rejection reason, then stop

export type TurnError = { code: ProviderErrorCode | "bad_reply" | "empty_input"; message: string };

export type TurnResult =
  | { ok: true; say: string; applied: ActionOutcome[]; skills: string[]; provider: ProviderId }
  | { ok: false; error: TurnError };

export type TurnDeps = {
  store: Store;
  provider: Provider;
  model: string | null;
  loadSkill?: SkillLoader;
  /** When it aborts the turn stops and nothing is written. */
  signal?: AbortSignal;
};

const turnError = (code: TurnError["code"], message: string): TurnResult => ({ ok: false, error: { code, message } });

/**
 * One conversational turn: build state + nd-skills prompt, ask the provider, validate the reply,
 * then apply only validated actions. Model proposes, app disposes: nothing is written before parsing succeeds.
 */
export async function runTurn(deps: TurnDeps, userText: string, history: readonly HistoryMessage[] = []): Promise<TurnResult> {
  const text = userText.trim();
  if (!text) return turnError("empty_input", "Type what's on your mind first.");
  if (text.length > MAX_USER_CHARS) {
    return turnError("empty_input", `That message is ${text.length} characters. Keep it under ${MAX_USER_CHARS}, or split it.`);
  }

  const skills = selectSkills(text);
  const system = buildSystemPrompt(skills, deps.loadSkill ?? loadSkill);
  const snapshot = buildSnapshot(deps.store);
  const basePrompt = buildUserPrompt(snapshot, text, history);

  let prompt = basePrompt;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const response = await deps.provider.complete({ system, prompt, model: deps.model, signal: deps.signal });
    if (!response.ok) return { ok: false, error: response.error };
    if (deps.signal?.aborted) return turnError("aborted", "Stopped.");

    const parsed = parseAgentReply(response.value);
    if (parsed.ok) {
      const applied = executeActions(deps.store, parsed.reply.actions, snapshot.refs);
      return { ok: true, say: parsed.reply.say, applied, skills, provider: deps.provider.id };
    }
    prompt = `${basePrompt}\n\nYour previous reply was rejected: ${parsed.error}. Reply again with ONLY the JSON object.`;
  }
  return turnError("bad_reply", "The model didn't answer in the format Heel needs. Try again, or pick another model in Settings > Brain.");
}
