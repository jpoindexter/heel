import { SKILL_FILE_MAX_CHARS } from "../../shared/api";

/** What "Add a skill" starts from: the shape, one working example of each field. */
export const NEW_SKILL_TEMPLATE = `---
name: weekly-review
description: A calm look back at the week, one thing to carry forward.
triggers: weekly review, friday
---
Ask what got done, what slipped, and the one thing for Monday. Keep it to three short questions. No guilt.
`;

/** How full the editor is, in words: the file may be a little longer than what Heel reads. */
export function sizeNote(length: number): { text: string; over: boolean } {
  const over = length > SKILL_FILE_MAX_CHARS;
  return { text: `${length} of ${SKILL_FILE_MAX_CHARS}`, over };
}

/** What chooses a skill, in a line: its words, or "always". */
export function triggerLine(triggers: readonly string[]): string {
  if (triggers.length === 0) return "Only when you switch it on for a message (no trigger words)";
  if (triggers[0] === "always") return "Always on";
  return `When you say: ${triggers.join(", ")}`;
}
