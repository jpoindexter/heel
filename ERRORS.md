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

## 2026-11-16 — Codex subscription image output
What failed: initially assumed image edits required the Images API; then asked Codex's final text response to supply its output path. A real built-in edit succeeded but its assistant reply reported no accessible path, so the application rejected a valid result.
What worked: Codex 0.163.0 exposes image_generation using ChatGPT subscription login. Parse the engine's thread.started receipt and read the one fresh PNG from that thread's generated_images directory; validate the actual image natively. Do not trust or require a model-invented file path. Keep shell/view-image/apps tools disabled and restrict the worker's filesystem to its input and generated outputs.
Why it failed: the built-in image tool's filesystem artifact and model-facing output hint are separate contracts. API credentials are not a prerequisite for this supported subscription tool path.

## 2026-11-17 — release and tests compiled the same helper concurrently
What failed: running `npm test` and `release:signed` together caused the two native-reader compilers to collide at the same output executable; the release linker failed and native integration tests failed.
What worked: run tests first, then the release build sequentially. The sequential suite passed all 810 tests.
Why it failed: both commands run `build:cv-reader` and mutate the same ignored output. Keep these commands sequential; no production processing change was needed.

## 2026-11-17 — chat file picker outlived the empty composer
What failed: native attachment selection took longer than the empty-composer blur timer. The composer unmounted its hidden file input while the macOS dialog remained open, so the chosen screenshot did not reach React.
What worked: count an open file picker as draft work; clear that state on file selection/cancel. A delayed chooser regression test holds the picker for three seconds; the corrected native picker returned a visible preview and the actual Codex subscription described its pixels.
Why it failed: the empty-text check ignored an in-progress native interaction. The file picker and image import now both prevent idle collapse.

## 2026-11-16 — First native photo OCR failure
What failed: the first OCR request from the packaged Photos UI failed while import, rotate and undo worked. The packaged executable and running packaged helper both subsequently read the same normalized photo successfully; the underlying first-use failure did not reproduce.
What worked: preserve the image, allow exactly one retry for local idempotent OCR, and never retry cancellation. Unit proof injects one failure then success and verifies a cancelled operation is attempted only once. This does not establish the original Apple Vision error's root cause.
