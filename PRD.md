# PRD — Heel (ND desktop companion)

**One-liner:** A floating desktop mascot that holds my tasks, reads my inbox, catches rabbit holes, and coaches my business, built for an autistic/ADHD brain.

## Problem
I get lost in rabbit holes, over-scope, and don't finish. Tasks, inbox, and projects live in too many places. Existing apps are mobile, ADHD-only, or nag. None sit on the desktop as a quiet presence.

## User
Me (senior UX + solo dev, autism + ADHD + dyslexia + aphantasia). Second user later: friend who built a similar Bunny/Owl companion.

## v0 done criteria
Built = the feature exists and was verified in the real window by me. Done = Jason saw it hold up in a real workday (S9). Only S9 ticks the left box.

| v0 criterion | Built | Done (S9) |
|---|---|---|
| One full workday on my Mac using it | — | [ ] |
| It held my tasks (add, complete, remove, survives restart) | [x] N6, N7 queue (edit/reorder), F7 persistence | [ ] |
| Inbox digest: ≤3 actions, literal one-line summaries, add as task in one click (Apple Mail, no keys) | [x] N11 | [ ] |
| One declared focus time-box ran with an end check-in ("where are you vs [goal verbatim]") | [x] S6 | [ ] |
| It never sent/deleted anything and never spoke past the interrupt budget | [x] S8 budget; N11 send only after Send on a preview | [ ] |
| Settings > Brain: choose provider and model, test connection | [x] S4 (Claude, Codex, Ollama each ran a real turn, 2026-10-15) | [ ] |

## In scope (v0)
Floating mascot (puppy-v1 art), one-surface panel (tasks, latest reply, a bar with + and four round buttons, a chat card), brain-dump capture, focus session, interrupt budget + Off, mail from Apple Mail (read, open, reply or draft with a preview first), local SQLite. Grew during build (all on the board): methods (Pomodoro, jar, sizes), History, search, split a task, documents + PDF, skills manager, attention sense (opt-in), notices/toasts, Greg's life.

## Out of scope (see PARKED.md / Trello v1, v2+)
Passive drift detection, calendar, business-coach weekly review, autism layer, drafts/sync, skins, voice, Windows, local-first private mode polish.

## Constraints
- macOS first, Tauri 2 shell, Hono sidecar, SQLite, React, TS strict, Zod at boundaries
- Silent by default; no sound; reduced-motion respected
- Autonomy: read-only + local writes auto; external drafts open in Mail unsent; a send happens only after the person presses Send on a preview in Heel (never by the AI on its own)
- Model proposes, app disposes (typed actions validated before execution)

## Non-goals
Streaks/gamification, platform/plugin system, multi-user, computer-use, mascot art cloning the friend's Bunny/Owl.

Board: https://trello.com/b/pbqxn0aI/greg-agent-nd-desktop-companion
