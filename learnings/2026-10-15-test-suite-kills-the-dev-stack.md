# Running the full test suite takes the running dev app down

**Context:** Twice during real-window verification the app vanished right after `npx vitest run`: the log showed the dev helper exiting with code 0, then `concurrently` sending SIGTERM to Vite, then the Tauri window gone.
**Dead ends:** Blamed the Rust rebuild the first time.
**What worked:** Running only the quality tests (`npx vitest run quality`) while the app is up; the whole suite only right before a commit, then restarting the app with the session's start script.
**Why:** Not pinned down. The helper starts with "one helper per data dir" guarding on the connection file; a test that touches the same guard or data dir makes the live helper exit cleanly, and the dev stack treats any exit as the end.
**Rule:** While driving the real app, run targeted tests; run the full suite between real-window sessions and expect to restart the app after it.
