# Ship native code as source and compile it once where it runs

**Context:** N15 — HTML → PDF with no cloud and no new dependency.

**Insight:** When the platform has the capability (WebKit's `createPDF`) but Node cannot reach it, a tiny Swift program is the cheapest bridge. `swift script.swift` costs ~10 s per run (it compiles each time); `swiftc -O` once into the app data folder makes every later call ~1 s. Name the binary by a version constant so a changed source compiles again, keep the source as a string in the TypeScript so bundling never changes, and turn "no compiler" into one sentence with the install command. Check the platform's "obvious" tool first: `cupsfilter` is still on macOS 26 but has no HTML filter.

**Apply when:** a feature needs an OS capability that the runtime language cannot call directly.
