# Never restore an old backup over data the person has kept using

**Context:** testing N3 after the packaged app had been in Jason's hands for an hour.

**Insight:** My stop script restores "the" backup byte for byte, and its guard only checks that a backup exists. The backup was from the morning; by afternoon the real database held Jason's own changes (he had switched the provider to Codex), partly in the `-wal` file, so even comparing `heel.db` to the backup said "identical". Running the old stop script would have deleted his settings. What saved it: reading the data folder before touching anything (the WAL was newer and the provider row said codex), quitting the app so the database checkpoints, taking a **fresh** backup into a new folder, and pointing new start/stop scripts at that. After the restore I read the provider row back to confirm it. A restore script needs a guard on freshness (the backup is newer than the last time the app ran), not only on existence.

**Apply when:** a test harness backs up and restores real user data across a long session, or the person may use the app between test runs.
