# A text patch landed in the wrong file and failed silently

**Context:** Adding `mail` to the turn route. `rg` showed `runTurn(` in `today-routes.ts`, but the edit script replaced the string in `turn.ts`, where it did not exist; Python's `str.replace` did nothing and said nothing.
**Dead ends:** Restarted the dev stack twice believing the helper had not reloaded; the real turn kept answering "Mail isn't available here".
**What worked:** `assert old in s` before `replace`, then re-reading `rg` for the file that actually holds the call site.
**Why:** `replace` returns the unchanged string on a miss; a scripted edit that does not check for its anchor is a no-op that looks like success.
**Rule:** Every scripted text edit asserts its anchor exists (and, when it matters, that it occurs once) before replacing; patch the file `rg` named, not the one the symbol is defined in.
