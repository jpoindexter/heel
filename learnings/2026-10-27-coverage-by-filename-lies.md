# "Untested module" list named files that were covered

**Context:** Audit step: list source files without a sibling `*.test.ts`. It named `providers/claude.ts` and `codex.ts`; a card was filed; the tests already existed in `cli-providers.test.ts`.
**Dead ends:** Filing the card from the list alone.
**What worked:** Before calling a module untested, grep the test tree for its exported names (`rg "claudeProvider" --glob '*.test.ts'`), not its filename.
**Why:** Test files are grouped by theme as often as by module; a filename pairing is a convention, not a fact.
**Rule:** "No test for X" is a claim about symbols, not files: grep the symbol in `*.test.*` before writing it down.
