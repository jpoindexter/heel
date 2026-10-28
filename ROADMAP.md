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
S1–S8 spike, store, agent, panel, capture, focus, budget · D1–D7 Radix design system light/dark (`ce6645a`, `8363547`) · R1 right-click menu (`550d362`) · A3a/A4a–d/16b mascot player + idle, walk, run off/on, hidden state (`550a2ad`…`866a0bb`) · F4 icon (`aa8d8aa`) · F6 Stop (`fc73cc5`) · F8 frame + tail (`10391b7`) · V1-10/F7 packaged app + 30-day history (`2dea034`) · S7 Gmail read-only, unwired (`70c8d84`) · N6 quick add (`1171e7b`) · N5 helper health (`390827d`) · N2 one surface (`18e8003`, `05d913d`) · N11 mail on this Mac (`3854b54`) · N12 notices (`de5ead0`) · N13 Greg shows work (`a11ddb5`) · B3 bubbles (`06ca9c7`) · N14 layers (`17572ca`) · A8 puppy art (`40758fb`) · N8+N16 History (`81f64d7`) · N17–N20 methods, Pomodoro, jar, sizes (`67b3808`, `10b7d32`, `ee20ede`) · N24a/b attention sense (`80cabef`) · B5 panel parks (`ba1e6ac`) · N25 Greg alive (`1a06504`, `49f06a1`) · N22 search (`2538958`) · N23 split (`e78b26f`) · B7 colour (`e65ad29`) · N15 documents + PDF (`6e5e460`, `0acb11e`) · B8+N3 toasts + skills (`d33d7de`) · N26 open named mail (`49169ef`, `886d1bb`) · N27 error boundary (`23c1b16`) · N28 docs (`ea3f810`) · N29 tests + smoke (`e5173fc`) · F9 layer focus (`8831e7d`) · F4 icon redo (`719ee26`) · N7 task basics (`9379182`) · B9/N9/N10 window levels, idle cost, startup + CSP (`bfe0c50`) · N30 debug log (`3d2c99f`) · N4 two-level settings (`f4e42ae`) · N21a–e methods (`8b9253e`) · merged 2026-10-27 (`95ab837`, `de3b1d4`) · V1-7 capacity modes, V1-9 API-key providers, V1-2 weekly review, V1-3 autism layer, B1-H2 panel shortcut setting, V1-10 release doc (2026-10-28).

## Open queue (canonical order lives on the Trello list "UP NEXT")
2026-10-27 afternoon: four area audits merged (Q1–Q2, S1–S2, R1–R2 Done on Trello); P1–P3 (panel silent failures, work loss, status copy) merged and Done by 15:20; UP NEXT is empty again. 2026-10-28: L1 leftovers (wipe in one transaction, Esc mid-fade double close, "Section" badge) Done; Heel.app rebuilt from e8e71dc (21:19, carries V1-7, V1-9, V1-2, V1-3); V1-10 leftovers (heel.db 0600, provider status kept 30 s) Done, notarize waits on an Apple Developer ID; V1-8 (absorbed by N4+N10) on Trello; the art cards A2/A5/A6/A7/V1-11 (integration shipped by A8, the puppy pack replaced their art lines) moved to Blocked: each still needs Jason's look in the real app (stripes or pixelation while moving, loop joins, transitions, reduced motion). V1-7 capacity modes (Normal / Low / Off) built the same evening on Jason's /goal. V1-9 API-key providers (Anthropic, OpenAI; key in the Keychain) built the same night. V1-2 weekly review built too; V1-1 was N24, V1-5's read and writes are N26, V1-6's drafts are N11 (the Trello/GitHub sync waits on Jason's tokens). V1-3 autism layer built (transition warnings parked). Open: V1-4 (a PR in the nd-skills repo, not this one). Then: **S9 dogfood one workday** (docs/S9-DOGFOOD.md). Waiting on Jason, each with its steps on the card: B1 mic test · F5 edge-resize drag · B3 a look at the bubble screenshots · the one-click checks on B9, N9, N10, N30, N4 (window level after a real click, click-through, login item, Dock flip, Copy report, Back up to Desktop).
