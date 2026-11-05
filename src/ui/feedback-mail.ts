import { DebugInfoSchema } from "../../shared/api";
import { FEEDBACK_BODY_MAX_CHARS, FEEDBACK_SUBJECT_MAX_CHARS, FEEDBACK_TO, FeedbackMailResultSchema, type FeedbackKind, type FeedbackMail } from "../../shared/feedback";
import { APP_VERSION } from "../../shared/version";
import type { Client } from "../api/client";
import { readDebugLog } from "./debug-log";
import { buildReport } from "./debug-log-report";

export type FeedbackDraft = {
  kind: FeedbackKind;
  title: string;
  /** Bug: what happened. Idea: what would help. */
  what: string;
  /** Bug: how to make it happen again. Idea: what you were trying to do. Optional. */
  more: string;
  /** The debug report, or null when the person left it out. */
  report: string | null;
};

/** The words for each kind, shared by the form and the email so both say the same thing. */
export const FEEDBACK_WORDS = {
  bug: { tag: "bug", heading: "Bug report", what: "What happened", more: "How to make it happen again" },
  idea: { tag: "idea", heading: "Feature request", what: "What would help", more: "What you were trying to do" },
} as const satisfies Record<FeedbackKind, { tag: string; heading: string; what: string; more: string }>;

export const REPORT_HEADING = "DEBUG REPORT (facts and logs only: no tasks, messages or mail)";
export const TRIMMED_NOTE = "\n…trimmed to fit an email. Settings › About › Debug › Export report… saves the whole report to attach.";
const RULE = "----";

const section = (heading: string, text: string): string[] => (text.trim() ? [heading.toUpperCase(), text.trim(), ""] : []);

/** One email Jason can scan: kind and title in the subject, short sections, the report last and trimmed to fit. */
export function feedbackMail({ kind, title, what, more, report }: FeedbackDraft, version = APP_VERSION): FeedbackMail {
  const words = FEEDBACK_WORDS[kind];
  const oneLine = title.replace(/\s+/g, " ").trim();
  const subject = `[Heel ${version} ${words.tag}] ${oneLine}`.slice(0, FEEDBACK_SUBJECT_MAX_CHARS);
  const head = [`${words.heading}: ${oneLine}`, "", ...section(words.what, what), ...section(words.more, more), RULE].join("\n");
  const tail = report === null ? "Debug report not included." : `${REPORT_HEADING}\n${report}`;
  const room = FEEDBACK_BODY_MAX_CHARS - head.length - 1;
  const fitted = tail.length <= room ? tail : tail.slice(0, Math.max(0, room - TRIMMED_NOTE.length)) + TRIMMED_NOTE;
  return { subject, body: `${head}\n${fitted}`.slice(0, FEEDBACK_BODY_MAX_CHARS) };
}

/** The same email as plain text with its address, for when no mail app would open. */
export const mailAsText = ({ subject, body }: FeedbackMail): string => `To: ${FEEDBACK_TO}\nSubject: ${subject}\n\n${body}`;

/** The debug report as it is right now (the helper's facts may be missing; the report says so). */
export async function reportNow(client: Client, crash: string | null = null): Promise<string> {
  const helper = await client.get("/debug", DebugInfoSchema);
  return buildReport({ helper: helper.ok ? helper.data : null, log: readDebugLog(), crash });
}

/** Ask the helper to open the draft in the person's mail app. Resolves true only when the Mac opened it. */
export async function openFeedbackMail(client: Client, mail: FeedbackMail): Promise<boolean> {
  const opened = await client.post("/feedback/mail", FeedbackMailResultSchema, mail);
  return opened.ok && opened.data.opened;
}
