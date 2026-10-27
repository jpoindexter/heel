# The menu-bar icon was there; the notch hid it

**Context:** F4's new tray icon could not be found in the menu bar of the running app on a 14" MacBook Pro.
**Dead ends:** Zoomed the bar capture looking for the puppy; suspected the dev binary predated the icon; tried System Events (osascript has no assistive access here).
**What worked:** `CGWindowListCopyWindowInfo` with `kCGWindowListOptionAll` (not OnScreenOnly): Heel owned four off-screen 1512×33 layer-0 windows, the shape of a hidden `NSStatusItem`; the on-screen layer-25 items began at the notch's right edge, so the bar was full.
**Why:** macOS drops status items that would reach the notch, newest-added first, with no overflow UI. An app started last is the first to vanish.
**Rule:** Before judging a menu-bar icon missing, count on-screen status items from the notch edge and list the app's windows with `OptionAll`; a QA that needs the icon must first free a slot or use an external display.
