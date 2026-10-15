import { z } from "zod";

export const MAX_TEXT = 500;
export const MAX_IDEA = 1000;

export const TASK_STATUSES = ["todo", "doing", "done", "dropped"] as const;
export const TASK_SOURCES = ["manual", "capture", "inbox"] as const;
export const FOCUS_OUTCOMES = ["continued", "parked_and_returned", "done", "abandoned"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type FocusOutcome = (typeof FOCUS_OUTCOMES)[number];

const text = (label: string, max = MAX_TEXT) =>
  z
    .string()
    .trim()
    .min(1, `${label} can't be empty.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const NewTaskInput = z.object({
  title: text("Task title"),
  source: z.enum(TASK_SOURCES).default("manual"),
  sourceRef: z.string().max(MAX_TEXT).nullable().default(null),
  nowStep: text("Next step").nullable().default(null),
});

export const NewParkedInput = z.object({
  idea: text("Idea", MAX_IDEA),
  why: text("Reason").nullable().default(null),
});

const minutes = (label: string) =>
  z.number().int(`${label} must be a whole number of minutes.`).positive(`${label} must be more than 0 minutes.`);

export const NewFocusInput = z
  .object({
    goal: text("Goal"),
    taskId: z.string().nullable().default(null),
    bestMin: minutes("Best case"),
    realisticMin: minutes("Realistic case"),
    worstMin: minutes("Worst case"),
  })
  .refine((v) => v.bestMin <= v.realisticMin && v.realisticMin <= v.worstMin, {
    message: "Time range must go best <= realistic <= worst.",
  });

export const LedgerPatch = z.object({
  outcome: z.string().max(MAX_TEXT),
  target: z.string().max(MAX_TEXT),
  must: z.string().max(MAX_TEXT),
  mustNot: z.string().max(MAX_TEXT),
  authority: z.string().max(MAX_TEXT),
  doneEvidence: z.string().max(MAX_TEXT),
  nowStep: z.string().max(MAX_TEXT),
}).partial();

export const FocusOutcomeInput = z.enum(FOCUS_OUTCOMES);

export type NewTask = z.output<typeof NewTaskInput>;

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  nowStep: string | null;
  source: (typeof TASK_SOURCES)[number];
  sourceRef: string | null;
  position: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
};

export type ParkedIdea = {
  id: string;
  idea: string;
  why: string | null;
  createdAt: number;
  promotedTaskId: string | null;
};

export type FocusSession = {
  id: string;
  goal: string;
  taskId: string | null;
  bestMin: number;
  realisticMin: number;
  worstMin: number;
  startedAt: number;
  endedAt: number | null;
  outcome: FocusOutcome | null;
};

export type Ledger = {
  id: string;
  taskId: string | null;
  outcome: string;
  target: string;
  must: string;
  mustNot: string;
  authority: string;
  doneEvidence: string;
  nowStep: string;
  updatedAt: number;
};

/** First Zod issue as one actionable sentence. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Input is not valid.";
}
