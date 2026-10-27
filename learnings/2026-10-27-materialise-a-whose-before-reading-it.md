# Materialise a JXA `whose` once; every property read on the bare specifier runs the predicate again

**Context:** N26 — reading the next seven days of Calendar events. Standalone the query took 35–46 s; inside the helper it hit the 90 s timeout every time.

**Insight:** `cal.events.whose({...})` is a specifier, not a result. Calling `.uid()`, `.summary()`, `.startDate()` on it one after another looked like cheap bulk reads but each one sent the whole predicate to Calendar again, which checks every event (one Apple Event each, 1,400 of them). Six reads = six scans. Calling the specifier once (`whose({...})()`) returns the handful of matching objects; reading their properties is then a few round trips. The same lesson in reverse: a bulk read on an unfiltered collection (`cal.events.startDate()`) is one Apple Event for the *count* but timed out at two minutes here, so "bulk" is not a free pass either. Parallel osascript processes did not help: Calendar serialises Apple Events, so seven queries in parallel finished in the time of the slowest plus the queue.

**Apply when:** a JXA/AppleScript query is slower in the app than in a terminal test, or any time a `whose` result is read more than once.
