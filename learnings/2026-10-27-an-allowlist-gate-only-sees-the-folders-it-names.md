# A boundary gate only judges the folders it names

**Context:** `quality/boundaries.ts` listed four features (mascot, settings, today, panel) and four shared layers. `focus/`, `inbox/` and `helper/` were in neither list, so every import into or out of them passed without a look. The gate was green for weeks.
**Dead ends:** Reading the allowlists for stale entries (both empty, nothing to find); trusting the green test.
**What worked:** Register the unlisted folders as features with the files other folders already import, run the gate, and read what it now rejects: three imports of `src/mascot/sheets` from `focus/` that no entry-point list declared. Add the real entry point, rerun, green. The failing run is the proof the gate can bite.
**Why:** The rule fires only when both ends are in `FEATURES`; a folder outside both lists is not "allowed", it is invisible. Empty allowlists look like paid-off debt but can also mean the scanner is not looking.
**Rule:** When auditing an allowlist gate, first list what it scans against what exists (`ls src` vs its keys); then make it fail once on purpose before trusting its green.
