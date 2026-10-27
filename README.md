# Heel

A quiet desktop companion for an autistic/ADHD brain: Greg, a small dog, sits on the macOS desktop; his panel holds your tasks, runs time-boxes, talks to the AI you already pay for, reads your mail on this Mac, and never nags. Built on [nd-skills](https://github.com/jpoindexter/nd-skills). Private, one user (Jason) until it has run one real workday (`PRD.md`).

## What it does today
- **Tasks**: add (`⌘↩` in the chat card adds instantly, no AI), complete, remove, park ideas, split a task into steps, pick a method (Pomodoro, pickle jar, T-shirt sizes), a History layer of what got done (no streaks, no points).
- **Heel (the AI)**: Enter in the card talks to Claude, Codex or Ollama. *Model proposes, app disposes*: every write is a typed action, validated, applied by the app, shown as a receipt with Undo.
- **Mail on this Mac** (Apple Mail): `+` › Email lists unread mail (7 days); Open shows it in Mail; Reply drafts with the AI and shows a **preview** — nothing is sent until you press Send; "draft an email to…" opens a filled-in draft in Mail, unsent.
- **Focus**: a time-box with a check-in in your own words; an interrupt budget of 3 a day the helper enforces; Quiet mode and Off.
- **Greg**: 34-clip puppy art, walks, naps, follows the pointer sometimes, shows when the AI is working, offers one way back when attention sense sees a rabbit hole (opt-in).
- **Work products**: research notes saved as documents, "make that a PDF" (WebKit, on this Mac).

## Requirements
- macOS (developed and tested on macOS 26, Apple silicon). Not signed or notarized yet: Gatekeeper will ask once (`V1-10`).
- **Node 22+** on the Mac (`node:sqlite`): the shell looks in `~/.local/bin`, Homebrew, `/usr/local/bin`, then your login shell; `HEEL_NODE=/path/to/node` overrides.
- For the AI: the `claude` or `codex` CLI signed in, or Ollama running. Nothing else is sent anywhere.
- Optional: Apple Mail set up (mail features), Xcode command line tools (`swiftc`, for PDFs).

## Run, build, test
```bash
npm install
npm run tauri dev                       # shell + panel + helper, hot reload
npm run tauri build -- --bundles app    # → src-tauri/target/release/bundle/macos/Heel.app
npm run typecheck && npm test           # 3 TS projects; ~660 Vitest tests incl. the quality gates
npm run secrets:scan                    # gitleaks (also on every commit once you run: git config core.hooksPath .githooks)
```
Quality gates run as tests: files ≤ 300 lines / functions ≤ 50, no raw px/ms/colour outside `src/design/tokens.css`, import boundaries (`quality/`).

## Permissions macOS will ask for (each once, each only when first used)
| Prompt | Asked when | Used for | Code that asks |
|---|---|---|---|
| Automation › Mail | first Email / Reply / draft | reading unread mail, opening a message, a reply or draft in Mail | `sidecar/mail/jxa.ts` (osascript JXA) |
| Notifications | first notice with the panel closed | a copy of Heel's toast in Notification Center (off in Settings) | `src-tauri/src/system_notice.rs` |
| none | attention sense (opt-in in Settings) | front app name + seconds idle, kept for today only, never sent to the AI | `src-tauri/src/attention.rs`, contract in `docs/` (N24a) |

## Where your data lives
`~/Library/Application Support/studio.theft.heel/`
- `heel.db` (+ `-wal`, `-shm` while running): tasks, parked ideas, focus sessions, conversation (30-day retention), settings, history, documents index
- `documents/`: your saved notes (Markdown) and their PDFs · `skills/`: skills you added · `pdf/`: the compiled PDF printer
- `sidecar.json` (port + token, mode 0600, removed on quit) · `sidecar.log` · `panel-size-v2.json` · `mascot-hidden.json`

Back it up by copying the folder with Heel quit. Gmail OAuth secrets (the unused fallback path) live in the macOS Keychain, never in files.

## Safety rules (enforced in code and tests)
- Reading never changes anything. The AI can only *open* a draft; a send happens only when you press Send on Heel's preview (`POST /mail/reply/send`, called by that button alone).
- What was sent to the AI is shown under every digest and draft. Email text is passed to the model as data, not instructions.
- The helper listens on 127.0.0.1 with a random port and a random token; requests need the loopback Host, an allowed origin and the token (`sidecar/server/guards.ts`).
- Heel speaks at most 3 times a day (`DAILY_INTERRUPT_LIMIT`), never in Quiet mode, never during a time-box unless about it.

## Layout
`src-tauri/` Rust shell · `src/` React panel + mascot · `sidecar/` Node helper (Hono + SQLite + agent + providers + mail + pdf) · `shared/` Zod wire schemas · `quality/` gate tests · `docs/ARCHITECTURE.md` has the map. Decisions: `DECISIONS.md`. Deferred: `PARKED.md`. Tracker: the Trello board "Greg Agent — ND desktop companion".
