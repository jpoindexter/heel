# Verify a vendored file inside the bundle, at the bundle's own path

**Date:** 2026-10-29 · **Context:** Heel re-vendored nd-skills (V1-4) and rebuilt Heel.app.

## Insight

A re-vendor is done when the shipped bundle carries the new text, not when the source tree does. Tauri puts `bundle.resources` under `Contents/Resources/resources/<path>`, one level deeper than the source path, so a check written from the source layout reports "No such file" and looks like a broken build.

## How to apply

- After any vendor/pin bump, `rg` the distinguishing line (here "Host notes") and the pin inside `Heel.app/Contents/Resources/resources/...`, found with `find … -name SKILL.md` rather than a guessed path.
- Say in the recap that the installed app still runs the old text until it is relaunched.

## Related

- [2026-10-15 typecheck-both-projects](2026-10-15-typecheck-both-projects.md) — same shape: verify with the project's real artefact, not a proxy.
