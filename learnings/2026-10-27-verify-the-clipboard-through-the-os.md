# The preview browser refuses to read the clipboard; the OS does not

**Context:** N30's "Copy report" had to be verified on the real path (clipboard content read back). `navigator.clipboard.readText()` in the preview tab answered "Read permission denied"; emulated drags placed the selection start but never extended it, so `getSelection()` read one character.
**Dead ends:** Reading the clipboard from the page; drag, double-click and triple-click in the box's padding (the pre's top 8 px are padding, not text).
**What worked:** `pbpaste` from the shell after the click (the preview runs on this Mac, so the system clipboard is the real one); for selectability, the computed `user-select` plus a mousedown inside the text followed by a shift-click, which the browser treats as a real selection gesture.
**Why:** Clipboard read is permission-gated per origin; the OS clipboard is not. Emulated pointer input sends down/up without the moves a drag needs.
**Rule:** Verify "it is on the clipboard" with `pbpaste`, never with the page; verify "it is selectable" with computed style + a click inside the text, and say that a real drag was not driven.
