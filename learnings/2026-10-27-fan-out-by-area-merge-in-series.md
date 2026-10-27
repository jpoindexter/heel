# Fan out by area, merge in series

**Context:** Heel, 2026-10-27. Four audit-and-fix agents ran at once (sidecar, panel, Rust shell, quality/docs), each in its own worktree, then three more one-per-Trello-card.

**What worked:**
- Partition by *folder*, not by topic, and say in the brief which files the agent must not touch. Zero merge conflicts across seven branches.
- Every brief carries the same gate line (`npm run typecheck`, `node node_modules/vitest/vitest.mjs run`, `npm run smoke`, `CARGO_TARGET_DIR` inside the worktree) and the same safety list (no `pkill -f`, no real app, no live data dir, no `rm -rf`). Agents that start cold follow the brief, not the repo's habits.
- Ask for "findings NOT fixed with file:line and a concrete case" as a report section; it becomes the next Trello cards verbatim.
- Merge one branch at a time into main and run the full gate once per merge. Fix-ups (size limits, a shared helper that two branches both needed) land on main between merges.
- The harness restart did not lose anything: branches and commits survived, and `SendMessage` to the agent id resumed each one from its transcript.

**Cost:** ~250k tokens per audit agent, ~7 min wall each when run together; the serial merge-and-gate loop is the bottleneck, not the agents.
