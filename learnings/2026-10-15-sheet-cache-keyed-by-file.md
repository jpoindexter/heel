# A per-sheet cache must key on the file, not on the sheet's name

**Context:** The puppy pack is one sheet per clip, all with the sheet id "puppy". The hit-region hook cached decoded pixels and boxes by sheet id, so every clip would have reused the first clip's pixels.
**Dead ends:** Trying to observe the hit-region invoke from the driver (the Tauri API holds its own reference to `invoke`; a wrapper on `window.__TAURI_INTERNALS__` sees nothing).
**What worked:** Key both caches by the image URL; recompute the box in the window the way the hook does and compare with the source frame's bounds.
**Why:** The id names the family, the URL names the pixels; a cache keyed on the family silently serves the wrong pixels once the family has more than one file.
**Rule:** When a type that was 1:1 with a file becomes 1:n, grep for caches keyed on the old identity before adding the second file; and verify a hidden invoke by recomputing its input, not by wrapping the bridge.
