import { SPLIT_MAX_STEPS, SPLIT_MIN_STEPS, SplitProposalSchema } from "../../shared/api";
import type { Task } from "../store/schema";
import { extractJson } from "./actions";
import type { Provider, ProviderResult } from "./providers/types";

/** Written for the ND rules: small steps, verbs first, the easiest first (task initiation), nothing written by the model itself. */
export const SPLIT_SYSTEM = `You split one task into small concrete steps for a person who finds starting hard.
Rules: ${SPLIT_MIN_STEPS} to ${SPLIT_MAX_STEPS} steps. Each starts with a verb, names one concrete action, and fits one short work session (about 25 minutes). The first step is the easiest one, something that can start in the next minute. No step is "plan" or "think about". Keep the person's words where you can. No commentary.
Reply with ONLY this JSON object, nothing else: {"steps": ["...", "..."]}`;

export const splitPrompt = (task: Pick<Task, "title" | "nowStep">): string =>
  `Task: ${task.title}${task.nowStep ? `\nThe person's own first step so far: ${task.nowStep}` : ""}\nSplit it.`;

/** Steps cleaned the way a careful person would: trimmed, bullets and numbering gone, blanks and repeats dropped. */
export function cleanSteps(raw: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const steps: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const step = item.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim().slice(0, 500);
    const key = step.toLowerCase();
    if (!step || seen.has(key)) continue;
    seen.add(key);
    steps.push(step);
  }
  return steps.slice(0, SPLIT_MAX_STEPS);
}

export type SplitParse = { ok: true; steps: string[] } | { ok: false; error: string };

/** The model's reply as steps, or why it will not do. */
export function parseSplitReply(text: string): SplitParse {
  let json: unknown;
  try {
    json = extractJson(text);
  } catch {
    return { ok: false, error: "the reply was not a JSON object" };
  }
  const raw = json && typeof json === "object" && Array.isArray((json as { steps?: unknown }).steps) ? ((json as { steps: unknown[] }).steps) : null;
  if (!raw) return { ok: false, error: "steps must be a list of strings" };
  const parsed = SplitProposalSchema.safeParse({ steps: cleanSteps(raw) });
  return parsed.success ? { ok: true, steps: parsed.data.steps } : { ok: false, error: `${SPLIT_MIN_STEPS} to ${SPLIT_MAX_STEPS} steps are needed` };
}

type Deps = { provider: Provider; model: string | null; signal?: AbortSignal };

/** Ask the chosen AI for the steps. One retry with the reason. Nothing is written here: the person confirms first. */
export async function proposeSplit(deps: Deps, task: Pick<Task, "title" | "nowStep">): Promise<ProviderResult<string[]>> {
  const base = splitPrompt(task);
  let prompt = base;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await deps.provider.complete({ system: SPLIT_SYSTEM, prompt, model: deps.model, signal: deps.signal });
    if (!response.ok) return response;
    const parsed = parseSplitReply(response.value);
    if (parsed.ok) return { ok: true, value: parsed.steps };
    prompt = `${base}\n\nYour previous reply was rejected: ${parsed.error}. Reply again with ONLY the JSON object.`;
  }
  return { ok: false, error: { code: "failed", message: "The model didn't answer with steps Heel can use. Try again, or pick another model in Settings > Brain." } };
}
