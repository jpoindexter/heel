import type { TaskDto } from "../../shared/api";

/** The Now strip: the first open task's next step (or its title). One thing, not a list. */
export type NowCard = { text: string; taskTitle: string | null; task: TaskDto };

export function nowCard(tasks: readonly TaskDto[]): NowCard | null {
  const first = tasks[0];
  if (!first) return null;
  return first.nowStep ? { text: first.nowStep, taskTitle: first.title, task: first } : { text: first.title, taskTitle: null, task: first };
}

export type ChipId = "plan" | "stuck" | "park";

export type Chip = { id: ChipId; label: string; /** null = acts on the text in the ask box instead of asking the AI */ prompt: string | null };

/** Fixed order and position (predictability). Labels are verbs; at most three. */
export const CHIPS: readonly Chip[] = [
  { id: "plan", label: "Plan", prompt: "Help me plan what to do next. Pick the one smallest next step." },
  { id: "stuck", label: "Stuck", prompt: "I'm stuck and I don't know where to start. Give me one small first step." },
  { id: "park", label: "Park it", prompt: null },
];

export const PARK_HINT = "Type the idea first, then press Park it.";

const NEEDS_SETTINGS = new Set(["not_ready", "not_signed_in", "not_installed"]);

/** Errors are one sentence; the ones fixed in Settings also offer a way there. */
export function replyError(code: string, message: string): { message: string; offerSettings: boolean } {
  return { message, offerSettings: NEEDS_SETTINGS.has(code) };
}
