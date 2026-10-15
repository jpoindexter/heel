# A self-hiding element must be acted on in the same step that found it

**Context:** Verifying Greg's 8-second notice bubble: a poll found it, a screenshot followed, then a separate command clicked Undo; the task was not restored.
**Dead ends:** Suspected the cross-window Undo event and the receipt-undo path; both were fine.
**What worked:** Click Undo inside the loop iteration that detected the bubble, then check state. Also: Radix Toast pauses its clock while the window is unfocused, so a driven (unfocused) window needs a dispatched `focus` event before the fade can be observed.
**Why:** The element had already faded between commands; `?.click()` on nothing fails silently, which reads like a wiring bug.
**Rule:** When verifying anything that disappears on a timer, detect and act in one step, and read the element's text before acting so the log shows what was there.
