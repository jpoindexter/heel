# Could not click or type in the real Tauri window (no Accessibility permission)

**Context:** Heel's panel needed real-window testing; `cliclick` and `osascript` were refused (no Accessibility), `CGEventPostToPid` did nothing.
**Dead ends:** `cliclick`, System Events scripting, per-pid CGEvent clicks. Signal: warnings/error -25211 and no window change.
**What worked:** Temporary Vite plugin (HTTP endpoint -> `server.ws.send`) + a client `import.meta.hot.on` handler running JS in the webview, with `core:window:allow-set-size/position` in a temp capability. Window bounds read with a small Swift `CGWindowListCopyWindowInfo` tool; a second launch of the binary reveals the panel via single-instance. Back up and restore the user's data dir around it.
**Why:** The dev webview loads from a server you control, so the server can push code into it; the OS never needs to see an input event.
**Rule:** When synthetic input is blocked, drive a dev-served webview through the dev server's websocket and read window geometry from the OS window list; never commit the driver and restore user data afterwards.
