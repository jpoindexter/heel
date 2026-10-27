# Renumber a reordered list in the order it is displayed, not the order it is stored

**Context:** N7 — "Make this Now" and Move up / down on a list whose split tasks carry their steps as child rows.

**Insight:** The list is sorted by one `position` column, but the panel nests steps under their task whatever their position, and "Now" is simply the first row. Swapping two positions would have worked once; after a few moves the children's positions (handed out as max+1 at creation) could sort ahead of a task, and the first row would be a step. Writing positions back in display order — each top-level task, then its steps — after every placement keeps the invariant the UI relies on, keeps the numbers small, and makes "place = index among siblings" a stable undo value (the old index is enough to put it back). The test that caught the trap: split a task, move another task first, assert titles in order.

**Apply when:** a stored order and a displayed order differ (nesting, grouping, pinning) and the first item has a meaning.
