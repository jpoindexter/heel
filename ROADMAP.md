# ROADMAP

## v0 — Shippable to one user (me)
Done = one real workday, see PRD.md. Sequential, one end-to-end before the next.
1. S1 Tauri spike: transparent always-on-top mascot, click toggles panel, hotkey, tray (time-box 2h)
2. S3 SQLite store + Zod schemas + reversible migrations
3. S4 Agent core headless: provider layer (claude CLI, codex CLI, ollama, api-key) + typed actions + contract tests; ships Settings > Brain (provider + model picker + test connection)
4. S2 Panel UI: tasks, ask box, <=3 fixed chips, accessible
5. S5 Brain-dump capture -> tasks + one Now step; S6 Focus session + end check-in
6. S8 Interrupt budget + Off mode + copy rules
7. ~~S7 Gmail digest, read-only~~ → N11 Mail on this Mac: digest, open, reply with preview, draft_email (2026-10-15)
8. S9 Dogfood one workday

## v1 — After real use
Full Settings tab (privacy, capacity, skills, mascot), passive drift detection + Vault, business coach (weekly review), autism layer (literal-reading, scripts, transitions, PDA phrasing), nd-skills companion pack, calendar read, drafts + Trello/GitHub sync, capacity modes.

## v2+ — Aspirational
Local-only private mode, skins/voice/aura/rhythm, Windows port, first outside user.

## Shipped (commit · 2026-10-15/16 unless noted)
S1–S8 spike, store, agent, panel, capture, focus, budget · D1–D7 Radix design system light/dark (`ce6645a`, `8363547`) · R1 right-click menu (`550d362`) · A3a/A4a–d/16b mascot player + idle, walk, run off/on, hidden state (`550a2ad`…`866a0bb`) · F4 icon (`aa8d8aa`) · F6 Stop (`fc73cc5`) · F8 frame + tail (`10391b7`) · V1-10/F7 packaged app + 30-day history (`2dea034`) · S7 Gmail read-only, unwired (`70c8d84`) · N6 quick add (`1171e7b`) · N5 helper health (`390827d`) · N2 one surface (`18e8003`, `05d913d`) · N11 mail on this Mac (`3854b54`) · N12 notices (`de5ead0`) · N13 Greg shows work (`a11ddb5`) · B3 bubbles (`06ca9c7`) · N14 layers (`17572ca`) · A8 puppy art (`40758fb`) · N8+N16 History (`81f64d7`) · N17–N20 methods, Pomodoro, jar, sizes (`67b3808`, `10b7d32`, `ee20ede`) · N24a/b attention sense (`80cabef`) · B5 panel parks (`ba1e6ac`) · N25 Greg alive (`1a06504`, `49f06a1`) · N22 search (`2538958`) · N23 split (`e78b26f`) · B7 colour (`e65ad29`) · N15 documents + PDF (`6e5e460`, `0acb11e`) · B8+N3 toasts + skills (`d33d7de`) · N26 open named mail (`49169ef`).

## Open queue (canonical order lives on the Trello list "UP NEXT")
N26 (rest: Calendar, Reminders, Notes) · B3 spacing pass · N7 task basics · N4 settings · N9 idle CPU · N10 login/Dock/CSP · F4 icon redo · A3b art acceptance · F9 a11y pass · F5 edge-resize proof · N21 more methods · N27 error boundary · N28 these docs · N29 tests + smoke · then **S9 dogfood one workday**. Blocked on Jason: B1 mic test (3 steps on the card).
