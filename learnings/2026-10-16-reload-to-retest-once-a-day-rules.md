# To retest a once-a-day rule, reload the window; to see a move, filter the window list by the right row

**Context:** N25 — the morning stretch fires once a day and the follow test read Greg's x from the wrong window.

**Insight:** A "first time today" rule keeps its memory in the component; after the real trigger has already fired (the person's mouse moved during launch), a synthetic trigger proves nothing. `location.reload()` through the driver resets the memory and the next synthetic trigger shows the path. And when two windows share a title prefix ("Heel", "Heel panel"), a grep on the prefix interleaves their rows; match the exact row shape (`Heel [0-9]`) before trusting a position trace.

**Apply when:** verifying once-per-day behaviour, or reading window geometry in a multi-window app.
