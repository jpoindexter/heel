# A disabled entry for a fixable state is a dead end

**Date:** 2026-11-03 · **Context:** Heel's AI selector greyed out Anthropic, OpenAI and Mistral until a key existed; the key field sat folded two rows below, so nobody could get from "I want Mistral" to the field.

## Insight

"Disabled with a reason" is right when the person cannot fix it from here (a CLI not signed in, Ollama not running). When the fix is one field away, the entry must *be* the fix: choosing it opens the setup and says the active choice is unchanged. The backend keeps the real guard (`not_ready` on activation), so the UI can let the click through without any risk of activating an unready provider. A controlled React `<details open>` driven by `a || b` cannot reopen once the person folds it while `a` is true, because the prop never changes; drive it from one state (`state ?? default`).

## How to apply

- For each disabled entry ask: can the person fix this from this screen? Yes → make the entry the setup action and keep the server-side guard. No → disabled with the reason.
- Controlled `<details>`: one `boolean | null` state, `open={state ?? derivedDefault}`, `onToggle` writes the state; never OR a derived flag into the prop.
- A fix verified by someone else on a specific binary: commit exactly what they verified, log the edge you found separately, so source and verified build stay equal.

## Related

- [2026-10-29 a-toast-over-a-popover-takes-esc](2026-10-29-a-toast-over-a-popover-takes-esc.md)
- [2026-10-16 explicit-request-vs-surprise-guard](2026-10-16-explicit-request-vs-surprise-guard.md)
