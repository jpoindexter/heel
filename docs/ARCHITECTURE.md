# Heel architecture

One sentence: a Tauri shell (Rust) shows a mascot window and a panel window; the panel is a React app that talks over localhost HTTP to a helper (Node, "sidecar") that owns the database and the AI providers. **The model proposes, the app disposes.**

```
src-tauri/src/   Rust shell: windows, docking, menus, tray, hotkey, click-through
src/             React panel + mascot (one Vite bundle, two windows)
sidecar/         Node helper: Hono server, SQLite store, agent loop, AI providers
shared/          Wire schemas (Zod) both sides validate with. Nothing else.
quality/         Tests that enforce the rules below
docs/ DECISIONS.md PARKED.md ROADMAP.md PRD.md ERRORS.md learnings/
```

## Where things go

| Concern | Folder | Notes |
|---|---|---|
| Design tokens, base reset | `src/design/` | `tokens.css` is the **only** place a raw px / ms / z-index may appear |
| Light / dark / system | `src/theme/` | pure `appearance.ts` + one hook |
| Shared UI pieces | `src/ui/` | `layers*` (one stack of panel layers: push/back/forward/home with directions), `notices*` + `Notifier` (one notice system: toast in the panel, bubble by Greg, Notification Center copy), `attention`, `method`; feature-free |
| Typed helper client | `src/api/` | every response validated |
| Panel shell | `src/panel/` | header, views, Esc, menu-bar requests |
| Today: tasks, reply, one input | `src/today/` | `TodayView` is the public entry |
| Settings | `src/settings/` | `SettingsView`, `brain-summary`, `useBrainSummary` are public |
| Mascot | `src/mascot/` | sprite player (`manifests/`, `puppy.ts` = the 34-clip pack), hit region, `work*` (shows the AI working), `life/` (idle, walk, nap, pointer, play, gags, following the panel); `motion-events` is public |
| Notice bubble window | `src/notice/` | the tiny window the shell places over Greg's head |
| Mail on this Mac | `sidecar/mail/` | JXA scripts for Apple Mail (`scripts.ts`), `osascript` runner, `MailSource` (+ fake), AI reply drafter; routes in `server/mail-routes.ts` |
| Documents + PDF | `sidecar/store/documents.ts`, `sidecar/pdf/` | saved notes under `documents/`; a Swift WebKit printer compiled once with `swiftc` |
| Skills | `sidecar/agent/skills.ts`, `skills/` | bundled nd-skills + the person's own under `<data>/skills/<slug>/SKILL.md`; off-switch per skill |
| Attention sense | `src-tauri/src/attention.rs`, `sidecar/store/attention.ts`, `shared/attention.ts` | shell samples front app + idle every 5 s (opt-in); helper folds, spends the budget, decides one nudge; rules are pure and tested |
| Agent loop | `sidecar/agent/` | prompt, actions (Zod), executor, providers |
| Persistence | `sidecar/store/` | SQLite behind `store.ts`; reversible migrations |
| HTTP | `sidecar/server/` | token + Host + CORS guards, routes |
| Windows: panel, dock, park, level | `src-tauri/src/panel_window.rs` (show/hide/toggle), `dock.rs` (panel follows Greg), `undock.rs` (parked panel, B5), `window_level.rs` (who floats, B9), `appear.rs` + `mascot_menu.rs` (Greg show/hide, his menu) | these six import each other on purpose (one window state, Rust allows module cycles in a crate); `lib.rs` wires them; `placement.rs` holds the pure geometry |

## Rules (all enforced by `npm test`)

1. **Size** – files <= 300 lines, functions <= 50 (`quality/size-limits.test.ts`). Known offenders live in `quality/size-allowlist.ts`, which only shrinks. Soft target: 200 / 30.
2. **No hard-coded design values** – colours, sizes, durations come from Radix Theme variables or `src/design/tokens.css` (`quality/no-hardcoded-design.test.ts`, allowlist empty).
3. **Boundaries** – `shared/` imports nothing from app code; `src/` never imports `sidecar/` and vice versa; `ui/ design/ theme/ api/` import no feature; a feature reaches another only through its public entry points (`quality/boundaries.ts`).
4. **Zod at every boundary**, no `any`, errors as values, one logger, no `console.log` committed.
5. **UI is Radix Themes + radix-ui primitives.** A new control is a Radix component first; custom CSS only for layout.
6. **Undoable writes** – any AI write is a receipt with an Undo route.

## Adding a feature

1. Name its folder (`src/<feature>/`), one component per file, hooks beside it, a pure `*-model.ts` with tests.
2. Put wire shapes in `shared/api.ts`; build the route in `sidecar/server/`; keep the store function in `sidecar/store/`.
3. Layout CSS in `<feature>.css` using only tokens.
4. Add the Done sentence to a Trello card before writing code.

## Architectural decisions already taken
Vanta integration is frozen (X1–X7 in Parked) until S9. Mail, and next Calendar/Reminders/Notes, go through macOS Automation (JXA over osascript) — no OAuth consoles; every write outside the app shows a preview first (DECISIONS 2026-10-15, N11).
