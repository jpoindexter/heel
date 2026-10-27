import { z } from "zod";
import { FOCUS_OUTCOMES, type FocusOutcome } from "../../shared/focus";
import { ALL_BUCKETS, SIZES, type Size } from "../../shared/method";

export { FOCUS_OUTCOMES, type FocusOutcome };

export const MAX_TEXT = 500;
export const MAX_IDEA = 1000;

export const TASK_STATUSES = ["todo", "doing", "done", "dropped"] as const;
export const TASK_SOURCES = ["manual", "capture", "inbox"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

const text = (label: string, max = MAX_TEXT) =>
  z
    .string()
    .trim()
    .min(1, `${label} can't be empty.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const sizeField = z.enum(SIZES, { error: `Size must be one of: ${SIZES.join(", ")}.` }).nullable();
const bucketField = z
  .string()
  .refine((b) => ALL_BUCKETS.includes(b), { message: `Bucket must be one of: ${ALL_BUCKETS.join(", ")}.` })
  .nullable();

export const NewTaskInput = z.object({
  title: text("Task title"),
  source: z.enum(TASK_SOURCES).default("manual"),
  sourceRef: z.string().max(MAX_TEXT).nullable().default(null),
  nowStep: text("Next step").nullable().default(null),
  size: sizeField.default(null),
  bucket: bucketField.default(null),
});

/** What a person (or the model) may change on a task later: its words, its next step, its place among its siblings, its size, bucket and estimate. */
export const TaskPatchInput = z
  .object({
    title: text("Task title"),
    nowStep: text("Next step").nullable(),
    /** 0-based index among the open tasks with the same parent (0 = Now, for a top-level task). */
    place: z.number().int("Place must be a whole number.").min(0, "Place must be 0 or more."),
    size: sizeField,
    bucket: bucketField,
    estimateMin: z.number().int("Estimate must be whole minutes.").positive("Estimate must be more than 0 minutes.").nullable(),
  })
  .partial()
  .refine((p) => Object.keys(p).length > 0, { message: "Send at least one of title, nowStep, place, size, bucket, estimateMin." });

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
  size: Size | null;
  bucket: string | null;
  estimateMin: number | null;
  /** The bigger task this one is a step of (N23), or null. */
  parentId: string | null;
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
