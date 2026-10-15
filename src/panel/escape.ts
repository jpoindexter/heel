/** Esc closes the panel only when nothing else wanted it: a Radix menu or select that closes on Esc marks the key as handled. */
export function shouldCloseOnKey(event: { key: string; defaultPrevented: boolean; isComposing: boolean }): boolean {
  return event.key === "Escape" && !event.defaultPrevented && !event.isComposing;
}

/** ⌘K or ⌘F anywhere in the panel opens search (N22); Ctrl on a keyboard without ⌘. */
export function opensSearch(event: { key: string; metaKey: boolean; ctrlKey: boolean; defaultPrevented: boolean; isComposing: boolean }): boolean {
  return (event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "f") && !event.defaultPrevented && !event.isComposing;
}
