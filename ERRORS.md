# ERRORS (append-only)

Log any fix that took more than 2 attempts. Format:

## YYYY-MM-DD — [task]
What failed / What worked / Why it failed

## 2026-10-27 — cargo test in a fresh integration worktree
What failed: (1) first run died mid-build with "build failed" and no error: a sibling session's `pkill -f "target/debug/heel"` matched the scratchpad `cargo-target/debug/heel-*` test binaries; (2) with a safe target dir, tauri-build failed: no `dist/`; (3) then: `glob pattern resources/sidecar/**/* path not found`.
What worked: `CARGO_TARGET_DIR=<scratch>/rs-out`, `npx vite build`, `npm run bundle:sidecar`, then `cargo test` (69 ok).
Why it failed: a new worktree has none of the build outputs tauri-build globs for, and the error line was hidden by my own `rg` filter on the first two tries; the kill was external.
