/**
 * Should the ask box take focus when the window gains focus?
 * Yes when this tab is showing and nothing else deliberate has focus (the page itself, or the box).
 * Never steal focus from a button or field the person is already using.
 */
export function shouldFocusAskBox(tabActive: boolean, focusedTag: string | null): boolean {
  if (!tabActive) return false;
  return focusedTag === null || focusedTag === "BODY" || focusedTag === "TEXTAREA";
}
