# A test run piped into grep reports grep's exit code, not the suite's

**Context:** `npx vitest run | grep … && git commit` committed twice while the size gate was failing: the pipeline's status was grep's (it found lines), so `&&` went ahead.
**Dead ends:** Reading the filtered output and trusting the absence of a FAIL line I had not matched.
**What worked:** `npx vitest run > log; echo "exit $?"` and only then the commit, with the failing test named from the log.
**Why:** In zsh and bash a pipeline's status is the last command's unless `pipefail` is set; a filter that matches anything exits 0.
**Rule:** Never put a gate behind a pipe when its status decides the next step; capture to a file, test `$?`, then filter the file.
