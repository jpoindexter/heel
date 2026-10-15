/** Esc closes the panel only when nothing else wanted it: a Radix menu or select that closes on Esc marks the key as handled. */
export function shouldCloseOnKey(event: { key: string; defaultPrevented: boolean; isComposing: boolean }): boolean {
  return event.key === "Escape" && !event.defaultPrevented && !event.isComposing;
}
