# A toast mounted over an open popover takes Radix's Esc

**Date:** 2026-10-29 · **Context:** Heel's panel popped the whole Settings layer when Esc was pressed in the AI dropdown.

## Insight

Radix Toast and Select are both DismissableLayers, and only the layer mounted last handles Esc. A toast that appears after a dropdown opened (an Undo toast, a crash notice) becomes the top layer, so the dropdown's Esc handler bails without `preventDefault`, and any app-level "Esc = back" listener that trusts `defaultPrevented` fires. The repro was invisible in a clean run and only showed with a toast on screen, which is exactly the real-use case (every settings change shows a toast).

## How to apply

- An app-level Esc handler checks for an open popover itself (`[role="listbox"], [role="menu"]`), not only `defaultPrevented`.
- When a key-handling bug won't reproduce, add the surrounding state the user actually has (a toast, a notice, a focus trap) before concluding it is fixed.
- A browser-driven repro: dispatch a real `ErrorEvent` on `window` to raise the toast while the dropdown is open, then send Esc and read the DOM.

## Related

- [2026-10-29 verify-a-vendored-file-inside-the-bundle](2026-10-29-verify-a-vendored-file-inside-the-bundle.md)
- [2026-10-15 act-on-timed-ui-in-the-same-step](2026-10-15-act-on-timed-ui-in-the-same-step.md)
