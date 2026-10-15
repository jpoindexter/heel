# PRD — Heel (ND desktop companion)

**One-liner:** A floating desktop mascot that holds my tasks, reads my inbox, catches rabbit holes, and coaches my business, built for an autistic/ADHD brain.

## Problem
I get lost in rabbit holes, over-scope, and don't finish. Tasks, inbox, and projects live in too many places. Existing apps are mobile, ADHD-only, or nag. None sit on the desktop as a quiet presence.

## User
Me (senior UX + solo dev, autism + ADHD + dyslexia + aphantasia). Second user later: friend who built a similar Bunny/Owl companion.

## v0 done criteria
- [ ] One full workday on my Mac using it
- [ ] It held my tasks (add, complete, remove, survives restart)
- [ ] Inbox digest: <=3 actions, literal one-line summaries, add as task in one click
- [ ] One declared focus time-box ran with an end check-in ("where are you vs [goal verbatim]")
- [ ] It never sent/deleted anything and never spoke past the interrupt budget
- [ ] Settings > Brain: choose provider and model, test connection (at least 2 providers working)

## In scope (v0)
Floating mascot (placeholder art), panel with tasks + ask box + <=3 chips, brain-dump capture, focus session, interrupt budget + Off, read-only Gmail digest, local SQLite.

## Out of scope (see PARKED.md / Trello v1, v2+)
Passive drift detection, calendar, business-coach weekly review, autism layer, drafts/sync, skins, voice, Windows, local-first private mode polish.

## Constraints
- macOS first, Tauri 2 shell, Hono sidecar, SQLite, React, TS strict, Zod at boundaries
- Silent by default; no sound; reduced-motion respected
- Autonomy: read-only + local writes auto; external drafts confirm; sends never
- Model proposes, app disposes (typed actions validated before execution)

## Non-goals
Streaks/gamification, platform/plugin system, multi-user, computer-use, mascot art cloning the friend's Bunny/Owl.

Board: https://trello.com/b/pbqxn0aI/greg-agent-nd-desktop-companion
