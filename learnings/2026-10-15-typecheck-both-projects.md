# Called the build "typecheck clean" while sidecar tests had type errors

**Context:** Heel has two TS projects: root (`tsc --noEmit`, the panel) and `sidecar/` (`tsc -p sidecar`). `npm run typecheck` runs both.
**Dead ends:** Running bare `tsc --noEmit` after each edit. Signal: it printed nothing, but `npm run typecheck` later reported 8 errors in `sidecar/server/today-routes.test.ts`.
**What worked:** Run `npm run typecheck` (both projects) before saying typecheck passes.
**Why:** The root config does not include `sidecar/`, so silence from it says nothing about sidecar code.
**Rule:** Before claiming typecheck passes, run the project's own `typecheck` script, not a bare `tsc`.
