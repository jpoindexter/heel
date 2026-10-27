# Focus never returned to the opener after Back

**Context:** A layer's unmount cleanup restored focus to the control that opened it. In dev (StrictMode) Back always fell to the fallback.
**Dead ends:** Blamed timing (rAF), the re-made header button (real, fixed by re-finding it by name), then guarded the cleanup with `section.current?.isConnected` — still broken.
**What worked:** Capture the DOM node in the effect setup (`const el = section.current`) and test `el?.isConnected` in the cleanup. StrictMode's rehearsal cleanup sees it connected and skips; the real unmount sees it gone.
**Why:** React detaches object refs (sets `.current = null`) before the passive cleanup runs, in the rehearsal as well as the real unmount, so the ref cannot tell the two apart; a closed-over node can.
**Rule:** In an effect cleanup, never read `ref.current` to decide whether the component is really gone; close over the node at setup and ask it.
