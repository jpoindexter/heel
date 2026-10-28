# PARKED (promote, never delete)

## Gamification / streaks / points
Captured: 2026-10-15. Why parked: streak loss feeds shame spirals; flagged as a dark pattern. Cost to revisit: low; needs evidence from real use.

## Computer-use / auto-send email (L3 actions)
Captured: 2026-10-15. Why parked: high blast radius, trust not earned. Cost to revisit: high (permissions, audit log, undo).

## Skill marketplace / plugin system / multi-user
Captured: 2026-10-15. Why parked: platform-thinking before users. Revisit after 3+ real users.

## Windows port
Captured: 2026-10-15. Why parked: v0 is macOS; friend's version runs on Windows. Cost: medium (active-window + permissions per OS).

## Passive rabbit-hole detection (active window vs declared Now)
Captured: 2026-10-15. Why parked: needs Accessibility permission UX and on-device classification. v0 uses time-box check-ins instead. This is the first v1 item.

## Stop button while Heel is thinking
Captured: 2026-10-15. Why parked: a real stop must cancel the provider process/request on the helper (AbortSignal through runTurn -> claude/codex spawn kill, Ollama fetch). A client-only stop would still let the turn write tasks. Cost to revisit: medium (3 providers + tests).

## Conversation history across restarts
Captured: 2026-10-15. Why parked: the thread lives as long as the panel window; saving it needs a table + migration and a privacy decision (what is kept, how to clear it). Cost: medium.

## Rounded transparent panel with a tail toward Greg
Captured: 2026-10-15. Why parked: needs a transparent Tauri window (macOS private API) and new hit-testing for the corners. Cost: medium; cosmetic.

## Chip shows a short label in the thread (not the full prompt)
Captured: 2026-10-15. Why parked: Plan/Stuck send a long prompt that shows as the person's message. Honest but noisy. Cost: small.

## Panel placement fallback: flip below Greg (or beside) when there is no room above
Captured: 2026-10-15. Why parked: seen in the real window: with the panel open Greg can't be dragged into the upper part of the screen (the panel hits the menu bar and pulls Greg back). Fix = place the panel below/beside Greg when above doesn't fit. Cost: small-medium (placement.rs + tests).

## Vanta integration X2–X7 (inbox events, texts, cron, calendar, Vanta as brain, Greg in Vanta's avatar window)
Captured: 2026-10-15. Why parked: PRD v0 = one real workday (S9) not done yet; this is platform work before a user day. X1 spike proved pairing + one chat turn, not approvals, and showed Vanta acts without asking in some modes. Cost to revisit: X1 finish ~2h (needs a way to raise a real approval), then X2–X6 each 1–3 days. Promote when: S9 is done and Jason names the one thing he missed most.

## Settings items from N4 that need the shell or their own card (2026-10-27)
Captured: launch at login + Dock toggle (N10), global hotkey change (built 2026-10-28: Settings › Startup › Panel shortcut, with Off), panel size reset, "show Greg on start", Node/Claude/Codex detection sentences in plain words, daily nudge budget, quiet hours, chat retention number (30 days is a constant), a "what was sent" log, settings search (flow-settings says search once past ~15 settings).
Why parked: each touches src-tauri or a helper feature another card owns; N4's slice was the two-level layout plus Privacy & data (backup, wipe with preview and typed confirm).
Cost to revisit: small each (a switch in its group, a shell command); search is a half day.

## Calendar "first thing starts at…" line and transition warnings (V1-5 leftovers)
Captured: 2026-10-28. Why parked: a line on the panel needs a Calendar read on every open (35–95 s on a 1,400-event calendar, and the first-use Automation prompt at launch); warnings 10/5/1 min before an event are optional interrupts under D4 and opt-in by V1-3. The read itself and the confirmed writes shipped in N26; asking Heel "what's on today" answers from the real calendar. Cost to revisit: small for the line (cached read, show only when fresh), medium for the warnings (a timer in the shell plus the budget).

## Two-way task sync with Trello and GitHub (V1-6 leftover)
Captured: 2026-10-28. Why parked: needs Jason's Trello API key + token and a GitHub token in the Keychain (the V1-9 key path can hold them), a chosen board and repo, and a conflict rule for edits on both sides. Drafts (the other half of V1-6) shipped in N11 through Apple Mail. Cost to revisit: 1–2 days once the tokens exist.

## Transition warnings 10 / 5 / 1 min before an event or a box ends (V1-3 leftover)
Captured: 2026-10-28. Why parked: an optional interrupt under D4 (budget 3/day, silent by default); needs a shell timer against the next calendar event (a Calendar read, see the V1-5 entry) and the box clock, and an opt-in switch. The box's end check-in already exists. Cost to revisit: small-medium (a timer, a switch, three notices).
