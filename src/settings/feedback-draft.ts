import { z } from "zod";
import { FeedbackReportSchema } from "../../shared/reports";

const KEY = "heel:feedback-draft-v1";
const DraftSchema = z.object({ kind: z.enum(["bug", "idea"]), title: z.string().max(120), what: z.string().max(3000), more: z.string().max(3000), withReport: z.boolean(), withEvents: z.boolean().default(false), pending: FeedbackReportSchema.nullable() });
export type FeedbackForm = z.infer<typeof DraftSchema>;
export const blankFeedback = (): FeedbackForm => ({ kind: "bug", title: "", what: "", more: "", withReport: true, withEvents: false, pending: null });

export function readFeedbackDraft(): FeedbackForm {
  try { return DraftSchema.parse(JSON.parse(localStorage.getItem(KEY) ?? "null")); }
  catch { return blankFeedback(); }
}
export function keepFeedbackDraft(draft: FeedbackForm): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(draft)); return true; }
  catch { return false; }
}
