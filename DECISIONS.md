# DECISIONS (append-only)

## 2026-10-15 — Desktop shell
Choice: Tauri 2 (Rust shell + React UI + Hono/SQLite sidecar).
Alternatives: Electron reusing apps/greg desktop shell; native SwiftUI/AppKit.
Why: light, native-feeling transparent window; same stack as indx; BongoCat (Apache-2.0) is a working reference.
Reversible? Yes until S1 slice ships. If the 2h spike fails, re-ask.

## 2026-10-15 — AI provider is user-selectable
Choice: Claude subscription (CLI), Codex subscription (CLI), Ollama (local), API key — behind one Provider interface.
Alternatives: single hard-wired Claude API.
Why: user wants choice of subscription/local/other; CLI spawn pattern already proven in apps/greg desktop/electron/ai-providers.mjs.
Reversible? Yes. Unverified: current provider terms for subscription use in a third-party app — check before sharing with anyone.

## 2026-10-15 — Model proposes, app disposes
Choice: providers return text/JSON; sidecar validates with Zod into typed actions and executes per the autonomy ladder.
Why: CLI providers have no tool calling; one action path for all providers; safety boundary lives in app code.
Reversible? Yes.

## 2026-10-15 — Separate product, macOS first
Choice: not part of the Greg nutrition app; macOS only for v0, Windows in v2.
Why: user answer; active-window/Accessibility APIs differ per OS.
Reversible? Yes.

## 2026-10-15 — Interrupt policy
Choice: silent by default, speaks at time-box end or when opened, budget 3/day, one-click Off. Nudges are timers/templates, not LLM calls.
Reversible? Yes (budget number is a setting).

## 2026-10-15 — Product name: Heel
Choice: Heel (dog command: stay close by my side). Repo jpoindexter/heel (private).
Alternatives: Fetch, Tether, Stay.
Why: fits a quiet, close companion; nod to Greg the dog without reusing the Greg name (Greg stays the nutrition app for now). No collisions found on GitHub or a web search; this is not a trademark search.
Reversible? Yes (repo rename is one command). Greg nutrition app rename: undecided, not touched.

## 2026-10-15 — Store: node:sqlite + Zod, behind one adapter
Choice: Node's built-in `node:sqlite` (no SQLite package), `zod` 4.x (MIT) for every boundary, `@types/node` 22 (dev, types only). Migrations are up/down pairs in `sidecar/store/migrations.ts`; never edit an applied one.
Alternatives: better-sqlite3 (stable, native build step), rusqlite in the Tauri shell.
Why: no new native dependency; Node 22.23 runs it. Risk: Node marks node:sqlite experimental, so the API could change. It is confined to `sidecar/store/store.ts` and `migrations.ts`, so a swap is a two-file change.
Reversible? Yes.
Also: one active focus session is enforced twice (app check + partial unique index in the DB); undo for delete/complete = `restore`, not a hard delete.

## 2026-10-15 — S4 agent core: providers behind one interface, actions validated before any write
Choice: `Provider` interface with three adapters (claude CLI, codex CLI, Ollama HTTP). The model replies with one JSON object `{say, actions[]}`; the app validates it with Zod, maps short refs (t1, t2) to real ids, and only then writes. One retry with the rejection reason, then a plain error and no writes. Allowed actions are local, undoable writes only (autonomy L1). Provider/model choice is stored in `settings` (migration 2).
Alternatives: provider-native tool calling (not available on the CLIs); API-key adapter now.
Why: one action path for every provider; CLI providers have no tool calling; the safety boundary lives in app code.
Deferred: API-key adapter (needs Keychain storage + a key UI) -> Trello. Rule of 3 is already met without it.
Verified live 2026-10-15: Codex (ChatGPT login) and Ollama (qwen2.5:14b) ran a full turn and wrote tasks. NOT verified live: Claude CLI (not signed in on this machine), only its signed-out status path.
Reversible? Yes.

## 2026-10-15 — S4 verification update: Claude CLI now live-verified
Update to the S4 entry above: after `claude auth login`, a full turn through the Claude CLI (max subscription) ran in 5.7s, added a task with a first step, and returned a plain, short reply. All three providers have now run a real turn: Claude 5.7s, Codex 7.1s, Ollama qwen2.5:14b 70.5s (cold).
