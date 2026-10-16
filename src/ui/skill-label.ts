/** A skill's id as a person says it: "user:weekly-review" → "weekly review", "nd-task-initiation" → "task initiation". */
export function skillLabel(id: string): string {
  return id.replace(/^user:/, "").replace(/^nd-/, "").replace(/-/g, " ");
}

/** "Used: task initiation, weekly review" — what was sent to the model besides the message, or null when nothing was. The router always runs and is not worth a word. */
export function usedLine(ids: readonly string[] | undefined): string | null {
  const shown = (ids ?? []).filter((id) => id !== "nd-executive-function-router").map(skillLabel);
  return shown.length ? `Used: ${shown.join(", ")}` : null;
}
