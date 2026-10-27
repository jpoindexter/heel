# "Needs a real click" was mostly false

**Context:** Five merged cards carried "not verified: needs a click" because no session may synthesize OS input on this Mac. The packaged webview cannot be driven, so the checks were about to be handed to Jason.
**Dead ends:** Trying to read switches through System Events (osascript has no Accessibility access); `lsappinfo info -only type` (prints NULL; the field lives in the pid line of the full output).
**What worked:** `tauri dev --config '{"identifier":"<test id>"}'` with `HEEL_DATA_DIR` on the same scratch dir, the dev-only e2e plugin (JS pushed into the named webview), and three building blocks: DOM `.click()` on the real controls, `__TAURI_INTERNALS__.invoke("toggle_panel_command")` (the click's own command), and `osascript -e 'tell application id "<test id>" to activate'` for the app activation a real click brings with it. Facts read from outside: CGWindowList order and layer, the shell's JSON files, `lsappinfo info -pid`, files on the Desktop.
**Why:** Only two things need a human finger: a user-activation gate (WebKit's clipboard refuses a programmatic click; the fallback sentence showed) and a physical pointer path (click-through onto the app below).
**Rule:** Before writing "needs a click", split the click into its command, its focus change and its gesture gate; drive the first two and name only the third as unverified.
