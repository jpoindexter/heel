/** An open Radix select or menu: both render only while open. */
export const OPEN_POPOVER = '[role="listbox"], [role="menu"]';

/**
 * Esc closes the panel only when nothing else wanted it. A Radix menu or select that closes on Esc marks the key as handled,
 * unless a toast appeared after it opened: the toast is then Radix's top layer and the select lets the key through unmarked,
 * so an open popover keeps Esc too.
 */
export function shouldCloseOnKey(event: { key: string; defaultPrevented: boolean; isComposing: boolean }, popoverOpen = false): boolean {
  return event.key === "Escape" && !event.defaultPrevented && !event.isComposing && !popoverOpen;
}

/** ⌘K or ⌘F anywhere in the panel opens search (N22); Ctrl on a keyboard without ⌘. */
export function opensSearch(event: { key: string; metaKey: boolean; ctrlKey: boolean; defaultPrevented: boolean; isComposing: boolean }): boolean {
  return (event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "f") && !event.defaultPrevented && !event.isComposing;
}
