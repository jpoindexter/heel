# An explicit request bypasses surprise guards, never the person's settings

**Context:** B6 — "Take a nap" did nothing while the panel was open.

**Insight:** A quiet guard ("do nothing of your own while the panel is open / a box runs") protects against *surprises*. Routing an explicit request through the same guard swallows it exactly when people try it. Give the request its own entry point that plays now and records *that it was asked for*, so the light touches (hover, panel opening) that normally cancel autonomous behaviour do not cancel the asked-for one — only an equally explicit act (a click, the menu) does. The person's own settings (Off, Reduce Motion) still shape the result (rest pose, no rise played) because those are not surprise guards.

**Also:** `cliclick` needs an Accessibility grant for the host app; without it, drive the exact event the native control emits and say the control itself was not clicked.

**Apply when:** a menu/command maps onto an autonomous engine with guards.
