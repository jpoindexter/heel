/**
 * Should the ask box take focus when the window gains focus?
 * Yes when this tab is showing and nothing else deliberate has focus (the page itself, or the box).
 * Never steal focus from a button or field the person is already using.
 */
export function shouldFocusAskBox(tabActive: boolean, focusedTag: string | null): boolean {
  if (!tabActive) return false;
  return focusedTag === null || focusedTag === "BODY" || focusedTag === "TEXTAREA";
}

/** Where a new answer lands in the thread: its first line if it is taller than the view (so reading starts at the top), else its end. */
export function replyAlignment(replyHeight: number, viewHeight: number): "start" | "end" {
  return replyHeight > viewHeight ? "start" : "end";
}
