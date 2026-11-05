import { z } from "zod";
/* Feedback from testers: a bug report or a feature request, opened as an email draft to Jason. Heel never sends it. */

/** The only address the helper will open a draft to; the panel cannot choose another. */
export const FEEDBACK_TO = "jason@theft.studio";
export const FEEDBACK_KINDS = ["bug", "idea"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const isFeedbackKind = (value: string): value is FeedbackKind => (FEEDBACK_KINDS as readonly string[]).includes(value);

export const FEEDBACK_SUBJECT_MAX_CHARS = 200;
/** Some mail apps cut long mailto: links; past this the debug report is trimmed and Export report… is the full copy. */
export const FEEDBACK_BODY_MAX_CHARS = 8_000;

export const FeedbackMailInputSchema = z.object({
  subject: z.string().trim().min(1).max(FEEDBACK_SUBJECT_MAX_CHARS),
  body: z.string().trim().min(1).max(FEEDBACK_BODY_MAX_CHARS),
});
export type FeedbackMail = z.output<typeof FeedbackMailInputSchema>;
export const FeedbackMailResultSchema = z.object({ opened: z.boolean() });

/** RFC 6068: every part percent-encoded, line breaks as CRLF, the subject on one line. */
export function mailtoUrl(to: string, { subject, body }: FeedbackMail): string {
  const oneLine = subject.replace(/\s+/g, " ").trim();
  return `mailto:${to}?subject=${encodeURIComponent(oneLine)}&body=${encodeURIComponent(body.replace(/\r?\n/g, "\r\n"))}`;
}
