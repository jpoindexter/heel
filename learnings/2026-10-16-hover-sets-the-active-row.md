# When hover moves the selection, the person's resting pointer picks for them

**Context:** N22 — Enter in the search box "opened the wrong hit" twice in the real window.

**Insight:** A palette where `pointerenter` moves the active row is right for mouse users, but the person's pointer resting over the list (Jason's real mouse was over the panel) silently moves the selection away from the first result, so a keyboard Enter acts on a row they never chose. It was not a bug in the code under test; it was the live pointer. For a test, click the row you mean, not Enter on "the first one"; for the product, the behaviour matches ⌘K palettes and stays.

**Apply when:** a list mixes hover selection with keyboard confirmation.
