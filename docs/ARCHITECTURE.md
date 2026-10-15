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
| Shared UI pieces | `src/ui/` | e.g. `Notifier` (Radix Toast); feature-free |
| Typed helper client | `src/api/` | every response validated |
| Panel shell | `src/panel/` | header, views, Esc, menu-bar requests |
| Today: tasks, reply, one input | `src/today/` | `TodayView` is the public entry |
| Settings | `src/settings/` | `SettingsView`, `brain-summary`, `useBrainSummary` are public |
| Mascot | `src/mascot/` | sprite, atlas, hit region; `motion-events` is public |
| Agent loop | `sidecar/agent/` | prompt, actions (Zod), executor, providers |
| Persistence | `sidecar/store/` | SQLite behind `store.ts`; reversible migrations |
| HTTP | `sidecar/server/` | token + Host + CORS guards, routes |

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

## Next architectural decision

How Heel relates to Vanta (companion pairing, ACP provider, or merge into Vanta Desktop) is open: see Trello card "23 V-AUDIT" and DECISIONS.md.
