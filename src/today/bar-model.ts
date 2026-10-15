/** The bar at the bottom of the panel: one pill, a + that rolls out four round buttons, and the chat card behind it. */

export type TrayAction = "plan" | "stuck" | "email" | "chat" | "add" | "park";

/** Which four roll out of +: in the bar (chat closed) and inside the card (chat open). Fixed order, always four. */
export const BAR_TRAY: readonly TrayAction[] = ["plan", "stuck", "email", "chat"];
export const CARD_TRAY: readonly TrayAction[] = ["add", "park", "plan", "stuck"];

export const TRAY_LABEL: Readonly<Record<TrayAction, string>> = {
  plan: "Plan my next step",
  stuck: "I'm stuck",
  email: "Check my email",
  chat: "Chat with Heel",
  add: "Add as task (no AI)",
  park: "Park for later",
};

/** Short name, for the tooltip. */
export const TRAY_NAME: Readonly<Record<TrayAction, string>> = { plan: "Plan", stuck: "Stuck", email: "Email", chat: "Chat", add: "Add task", park: "Park" };

/** Rolling in goes first-to-last; rolling back goes last-to-first. The CSS turns this into a delay. */
export function rollOrder(index: number, count: number, closing: boolean): number {
  return closing ? count - 1 - index : index;
}

/** How long the roll-back takes before the buttons are removed (matches --motion-exit plus the last stagger). */
export const TRAY_ROLL_BACK_MS = 190;

/** When the open card folds back to the pill, by what just happened. Typing or focusing cancels it. */
export const COLLAPSE_AFTER_MS: Readonly<Record<"blur" | "sent" | "added", number>> = { blur: 2500, sent: 900, added: 1500 };

/** A row fades out before it is removed; the reply too. */
export const LEAVE_MS = 170;

export type BarKey = "send" | "add" | "close" | null;

/** Enter talks to Heel, Cmd/Ctrl+Enter adds the text as a task at once, Esc closes the card. Shift+Enter is a new line. */
export function barKey(event: { key: string; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; isComposing?: boolean }): BarKey {
  if (event.key === "Escape") return "close";
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return null;
  return event.metaKey || event.ctrlKey ? "add" : "send";
}

/** The key hint under the text: only while there is text, and never while Heel is thinking. */
export function barHint(draftEmpty: boolean, thinking: boolean): string {
  if (draftEmpty) return "";
  return thinking ? "Heel is thinking" : "↩ ask Heel · ⌘↩ add as task";
}

/** After the chat card empties, wait this long before Greg stops listening (a retype would otherwise flicker him). */
export const TYPING_CLEAR_MS = 600;
