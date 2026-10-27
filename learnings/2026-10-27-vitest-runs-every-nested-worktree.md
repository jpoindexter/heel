# vitest runs every nested worktree

**Context:** Heel, 2026-10-27. Agent worktrees live under `.claude/worktrees/` inside the main checkout. `vitest run` on main reported 924 test files; the repo has 119.

**Insight:** vitest's default include is `**/*.test.*` and its default exclude does not know about `.claude/`, so a run from the parent checkout executes every sibling branch's suite too. A sibling's red test fails main, and main's number proves nothing about main.

**Rule:** any folder that holds other checkouts goes in `test.exclude` (here `"**/.claude/**"` via `configDefaults.exclude`). Check the file count against `git ls-files '*.test.*' | wc -l` when it looks too large.

**Also:** remove merged worktrees (`git worktree remove`, `--force` for ones with a build cache) as soon as their branch is on main; a locked one needs `git worktree unlock` first.
