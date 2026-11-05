# ERRORS (append-only)

Log any fix that took more than 2 attempts. Format:

## YYYY-MM-DD — [task]
What failed / What worked / Why it failed

## 2026-10-27 — cargo test in a fresh integration worktree
What failed: (1) first run died mid-build with "build failed" and no error: a sibling session's `pkill -f "target/debug/heel"` matched the scratchpad `cargo-target/debug/heel-*` test binaries; (2) with a safe target dir, tauri-build failed: no `dist/`; (3) then: `glob pattern resources/sidecar/**/* path not found`.
What worked: `CARGO_TARGET_DIR=<scratch>/rs-out`, `npx vite build`, `npm run bundle:sidecar`, then `cargo test` (69 ok).
Why it failed: a new worktree has none of the build outputs tauri-build globs for, and the error line was hidden by my own `rg` filter on the first two tries; the kill was external.

## 2026-10-27 — restoring the live data dir after the packaged-app QA
What failed: the restore branch ran `rm -f "$LD"/*` and then `cp -p "$B"/*`, with `B=$(ls -d live-backup-* | tail -1)`: the glob also matched `live-backup-104656.sha`, which sorts last, so `B` was the hash file, the diff against `$B.sha` failed (which is what triggered the restore), and the copy was a no-op. The live dir sat empty for one turn.
What worked: copying the five files by name from the backup folder and diffing the hashes (`shasum -a 256 *` vs the saved list): byte-identical.
Why it failed: a destructive step before the source was proven; a glob where an exact name was known. Rule: a restore never deletes; it copies over by explicit names and then verifies. A failed comparison is a reason to stop, not a reason to restore.

## 2026-11-05 — publishing the first GitHub release
What failed: `gh release create v0.1.0 … --target de796f7` twice. First a network timeout on the upload (no release, no tag left behind); then "Release.target_commitish is invalid": the API takes a branch or a full 40-character SHA, not a short one.
What worked: `--target "$(git rev-parse de796f7)"`, then `gh release view --json assets` and comparing the asset's sha256 digest with `shasum -a 256` of the local DMG.
Why it failed: a short SHA works in git but not in the releases API; and a failed upload prints its error under a line that looks like success, so read the release back before reporting it.
