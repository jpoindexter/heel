/** The most a task title may hold (matches the helper's limit). */
export const MAX_TASK_TITLE = 500;

/** What to add for what was typed: spaces tidied, nothing for an empty box. */
export function titleFromInput(typed: string): string | null {
  const title = typed.replace(/\s+/g, " ").trim().slice(0, MAX_TASK_TITLE);
  return title.length > 0 ? title : null;
}

/** Cmd+N (or Ctrl+N) means "new task": the one shortcut for getting to the quick-add box. */
export function isNewTaskKey(event: { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }): boolean {
  return event.key.toLowerCase() === "n" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
}
