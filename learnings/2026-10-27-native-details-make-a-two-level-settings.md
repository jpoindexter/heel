# One `<details name>` per group is a two-level settings list for free

**Context:** N4 wanted every setting in one compact two-level place inside a 300×420 panel. Radix Themes has no accordion; a hand-rolled one means state, keyboard handling and ARIA.
**Dead ends:** Considering a tab strip (too many groups for the width) and a custom accordion with React state.
**What worked:** A native `<details className="settings-group" name="settings-group">` per group with an `<h2>` and the current values inside `<summary>`. The shared `name` makes the browser close the others when one opens (Chrome 120+, Safari 17.2+); Enter/Space and focus come free; styling is `list-style: none` plus `::-webkit-details-marker { display: none }` and a chevron turned with the existing `--chevron-turn` token. Values at rest wrap rather than truncate, or they stop being values.
**Why:** The platform already implements the behaviour; code that only re-implements it is risk without value.
**Rule:** Reach for `<details name>` before any accordion component; let its value text wrap; put the group's heading inside `<summary>` and demote the sections to h3.
