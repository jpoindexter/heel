# Give the model a tool per turn, not per provider

**Context:** N15 — research turns need web search; every other turn must stay tool-less.

**Insight:** The safe default (`--tools ""`) and the research need are not in tension if the flag is decided per request from the person's own words: `web: wantsWeb(text)` travels in the CompleteRequest and the provider maps it to its own flag (`--tools WebSearch` for Claude's CLI). The model never chooses its tools; the ask does. Keep the signal list small and literal ("look into", "research", "find out", "sources", "compare") and put the honesty rule in the skill: "if you could not search, say so in the body".

**Apply when:** one provider interface serves turns with different trust needs.
