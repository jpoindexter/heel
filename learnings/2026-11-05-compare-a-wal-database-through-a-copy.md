# Compare a WAL database through a copy, by table

**Date:** 2026-11-05 · **Context:** checking that one launch of the packaged Heel left the person's data alone.

## Insight

After any run, `heel.db`'s bytes differ from the backup (SQLite checkpoints the WAL on close), so a file hash proves nothing either way. Reading the live file read-only fails too: `sqlite3 -readonly` on a WAL-mode database with no `-shm` file answers "unable to open database file (14)", and a `file:` URI breaks on the space in "Application Support". Copy the live `heel.db` into the scratchpad and compare per-table row counts and `.dump` hashes against the same from the backup copy; then diff the changed table's rows with titles hidden. That found the one real change (a task ticked done 16 s after launch) without touching the live file.

## How to apply

- Before a real-app run: back up by explicit names, record `count(*)` and `.dump | shasum` per table from the backup copy.
- After: copy the live db, repeat, `diff` the two lists. A file-hash mismatch on `heel.db` alone is expected; a table mismatch is the signal.
- Diff a changed table with `sqlite3 -line` and grep out content columns before showing it.
- Never restore over live data on a mismatch; ask what happened first.

## Related

- [2026-10-16 never-restore-a-stale-backup-over-live-data](2026-10-16-never-restore-a-stale-backup-over-live-data.md)
- [2026-10-27 renumber-in-display-order](2026-10-27-renumber-in-display-order.md)
