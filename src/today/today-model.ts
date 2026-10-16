import type { TaskDto } from "../../shared/api";
import { firstStep } from "./split-model";

/** The Now strip: the first open task's next step (or its title). One thing, not a list. */
export type NowCard = { text: string; taskTitle: string | null; task: TaskDto };

/** The first task's next step, or the first task; a split task's first open step counts as its next step (N23). */
export function nowCard(tasks: readonly TaskDto[]): NowCard | null {
  const split = firstStep(tasks);
  if (split) return { text: split.step.nowStep ?? split.step.title, taskTitle: split.parent.title, task: split.step };
  const first = tasks[0];
  if (!first) return null;
  return first.nowStep ? { text: first.nowStep, taskTitle: first.title, task: first } : { text: first.title, taskTitle: null, task: first };
}

export type ChipId = "plan" | "stuck";

export type Chip = { id: ChipId; label: string; prompt: string };

/** Fixed order and position (predictability). One tap asks the AI; with Email (when connected) there are at most three chips. */
export const CHIPS: readonly Chip[] = [
  { id: "plan", label: "Plan", prompt: "Help me plan what to do next. Pick the one smallest next step." },
  { id: "stuck", label: "Stuck", prompt: "I'm stuck and I don't know where to start. Give me one small first step." },
];

const NEEDS_SETTINGS = new Set(["not_ready", "not_signed_in", "not_installed"]);

/** Errors are one sentence; the ones fixed in Settings also offer a way there. */
export function replyError(code: string, message: string): { message: string; offerSettings: boolean } {
  return { message, offerSettings: NEEDS_SETTINGS.has(code) };
}
