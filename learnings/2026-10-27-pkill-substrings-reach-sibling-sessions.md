# Another session's `pkill -f` killed my test runs

**Context:** Full vitest in an integration worktree ended with exit 143; `cargo check` there said "build failed" with no compiler error.
**Dead ends:** Reran as if flaky; looked for a test that kills processes (none).
**What worked:** The sibling session's restart script runs `pkill -f "node_modules/.bin/vite"` and `pkill -f "target/debug/heel"`. Those substrings also match `node_modules/.bin/vitest` and `…/cargo-target/debug/heel-<hash>` test binaries. Running `node node_modules/vitest/vitest.mjs run` and `CARGO_TARGET_DIR=…/rs-out` put both outside the patterns; both passed.
**Why:** `pkill -f` matches anywhere in the command line, across every user session on the machine.
**Rule:** When two sessions share a Mac, kill by exact pid file, or anchor the pattern to the checkout path; when you are the victim, rename your argv rather than waiting for a quiet moment.
