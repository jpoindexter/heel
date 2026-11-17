# Handoff — 2026-10-27 (Heel, main @ d0897b4, pushed)

## State
- All side-session branches merged to main; typecheck / vitest / smoke green; Heel.app rebuilt from 5ba4a9a (identifier studio.theft.heel). Live data dir restored, hashes identical.
- Trello UP NEXT is empty. Blocked/needs Jason: B1 mic test · F5 edge drag · B3 bubble screenshots · one-click checks on N30 (Copy report), N9 (click-through + drag on Greg), N10 (login item), N4 fold.
- Next slice: S9 dogfood day (docs/S9-DOGFOOD.md).

## Why the last session looped
`/goal` is a built-in session-scoped Stop hook. Its condition included six checks only a human finger can do (no Accessibility grant on this Mac: AXIsProcessTrusted false, cliclick untrusted). It can never auto-clear → blocked ~20 turns. Fix: fresh thread, or `/goal clear`. Don't set a goal that includes manual checks.

## Re-entry
1. Open Trello Blocked list, do the six one-click checks, move cards to Done.
2. Start S9: run Heel.app for a workday, log to ERRORS.md / PARKED.md.

## Rules that bit this session (see ERRORS.md, learnings/)
- A restore never deletes — copy by explicit file names, then verify hashes.
- `pkill -f` substrings reach sibling sessions; use `node node_modules/vitest/vitest.mjs run` and `CARGO_TARGET_DIR`.
- Never commit the e2e vite plugin (`vite.config.ts` import, scratchpad `e2e/`).
