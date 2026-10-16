# Two of my own learnings bit me again in one pass

**Context:** B7 — measuring the dark theme from the driver.

**Insight:** (1) A `storage` event never fires in the window that wrote the key: to change a preference the panel reads from localStorage, go through the panel's own control, and never "restore" a value you did not read first — I overwrote Jason's saved "dark" with "system" for a minute. Read the current value, change it through the UI, put the read value back. (2) Radix segmented labels render twice, so match with `includes`, not equality. Both were in learnings already; a quick scan of learnings/INDEX.md before driving a UI would have saved two rounds.

**Apply when:** driving a real window to switch themes or settings.
