# Task rows clipped inside the panel's scrolling column

**Context:** The task list is a flex column with `overflow-y: auto`; each row had `min-height: 36px` for its hit target.
**Dead ends:** Blamed padding and the scroll position; the Now row's second line kept vanishing under the next row.
**What worked:** `.scroll > * { flex: none }` (and the same on the panel's other flex columns).
**Why:** A flex item's default `min-height: auto` keeps it at least content-sized, but an explicit `min-height` replaces that floor, so when the column is taller than its box the items shrink below their text to fit.
**Rule:** In a flex column that scrolls, set `flex: none` on the children (or never set `min-height` on them); a hit-target `min-height` silently re-enables shrinking.
