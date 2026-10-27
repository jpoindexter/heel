# Sibling worktrees inside the checkout reload the dev window on every write

**Context:** N26 real-window verification while two other sessions worked in `.claude/worktrees/*` under the same folder.

**Insight:** Vite watches the whole project root, and `.claude/worktrees/<name>/` is inside it, so every file those sessions wrote (even a tsconfig) made Vite clear its cache and full-reload Heel's windows mid-turn: a reply in flight was lost, the driver's websocket went quiet, and a reload with a broken Tauri IPC showed "Heel's helper isn't running" although `/health` answered. Ignoring `**/.claude/**` in `server.watch.ignored` (in the temporary driver plugin, so nothing in the repo changed) ended the reloads. Also: a full `vitest run` still takes the dev helper down (known), and a turn sent twice (a synthetic Enter *and* a Send click) queued two Calendar reads that pushed each other past the timeout.

**Apply when:** driving the real app while other sessions share the checkout, or when the dev window reloads for no reason of its own.
