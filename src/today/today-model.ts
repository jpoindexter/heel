import type { ActionOutcomeDto, TaskDto } from "../../shared/api";

/** nd-choicereduce: show the few things that matter now, fold the rest behind a count. */
export const MAX_VISIBLE_TASKS = 3;

export type NowCard = { text: string; taskTitle: string | null };

export type TodayView = {
  now: NowCard | null;
  visible: TaskDto[];
  hiddenCount: number;
};

/** The Now card is the first open task's next step (or its title); the list shows up to three tasks. */
export function todayView(tasks: readonly TaskDto[], expanded: boolean): TodayView {
  const first = tasks[0];
  const now: NowCard | null = first
    ? first.nowStep
      ? { text: first.nowStep, taskTitle: first.title }
      : { text: first.title, taskTitle: null }
    : null;
  const visible = expanded ? [...tasks] : tasks.slice(0, MAX_VISIBLE_TASKS);
  return { now, visible, hiddenCount: tasks.length - visible.length };
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

export type AppliedLine = { ok: boolean; text: string };

/** What Heel actually did, in words. A failed action says so; nothing is hidden. */
export function appliedLines(applied: readonly ActionOutcomeDto[]): AppliedLine[] {
  return applied.map((outcome) => ({ ok: outcome.ok, text: outcome.ok ? outcome.message : `Couldn't: ${outcome.message}` }));
}

const NEEDS_SETTINGS = new Set(["not_ready", "not_signed_in", "not_installed"]);

/** Errors are one sentence; the ones fixed in Settings also offer a way there. */
export function replyError(code: string, message: string): { message: string; offerSettings: boolean } {
  return { message, offerSettings: NEEDS_SETTINGS.has(code) };
}
