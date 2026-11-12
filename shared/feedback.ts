/** Reports are sent to the private Heel receiver; the destination is fixed on its server. */
export const FEEDBACK_TO = "jason@theft.studio";
export const FEEDBACK_KINDS = ["bug", "idea"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const isFeedbackKind = (value: string): value is FeedbackKind => (FEEDBACK_KINDS as readonly string[]).includes(value);
export const FEEDBACK_WORDS = {
  bug: { what: "What happened", more: "How to make it happen again" },
  idea: { what: "What would help", more: "What you were trying to do" },
} as const;
