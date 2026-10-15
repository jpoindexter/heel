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

## 2026-10-15 — S4b: local helper server (Hono) with per-launch token; Settings > Brain
Choice: `sidecar/server` (Hono + @hono/node-server, MIT) binds 127.0.0.1 on a random port, requires an `x-heel-token` header, rejects non-loopback Host headers, and only grants CORS to the panel's origins. It writes `{port, token}` to `sidecar.json` (mode 0600, in the app data dir `~/Library/Application Support/studio.theft.heel/`) and deletes it on exit. The panel gets that file through the Rust command `sidecar_info`, so a web page can never read the token. Wire types live in `shared/api.ts` and both sides validate with them.
Dev flow: `npm run tauri dev` runs `npm run dev:all` (concurrently: vite + sidecar). New deps: hono 4.13, @hono/node-server 2.1, concurrently 10 (dev). All MIT.
Not done: shipping a built app (the sidecar must be bundled and started/stopped by the app) -> Trello V1-10. `heel.db` is 0644 inside a 0700 folder.
Reversible? Yes.

## 2026-10-15 — One Heel at a time (app and helper)
Choice: `tauri-plugin-single-instance` 2.5.4 (Apache-2.0 OR MIT, official tauri-apps) registered first; a second launch exits at once and the running Heel brings its panel forward. The helper adds its own guard: it will not start if the recorded port already answers /health with the recorded token, and it deletes the connection file only if the token inside is its own.
Why: a failed second launch deleted the first helper's connection file, and two Heel windows ended up open.
Verified 2026-10-15: a second launch exited with code 0 in 0.1s and one process kept running. Not observed: the panel actually appearing on that second launch.

## 2026-10-15 — S2: Today tab wired to the agent (one turn at a time, what-was-done is always shown)
Choice: new helper routes `GET /tasks`, `POST /tasks/:id/(complete|drop|restore)`, `POST /parked`, `POST /turn` (uses the saved provider/model). Panel shows a Now card (first task's next step), up to 3 tasks (+ "N more"), a reply area that lists every action Heel actually took (✓ added / ! couldn't), three fixed chips (Plan, Stuck, Park it) and a labeled ask box. Park it needs no AI: it saves the typed text directly. Complete/remove apply at once with an 8s Undo (no confirm dialogs). One turn at a time; chips that call the AI are disabled while one runs.
Prompt rule added after a live run: the model said "parked" for something it had added. Wording must match the action (add_task = added, park_idea = parked). The ✓ lines remain the source of truth.
Verified 2026-10-15 in a browser against the real helper and a real Claude turn: Stuck chip, typed request + Enter, complete + Undo, Park it (empty and with text), no-provider error + Open Settings. NOT verified: inside the real Tauri window (panel 380x620), mascot thinking/done/error reactions, keyboard-only flow, screen reader.
Reversible? Yes.

## 2026-10-15 — Mascot art: Greg's Dot-compatible sheet is the primary sprite (Riff kept)
Choice: `public/mascot/greg.png` (Codex's `compatible-dot/spritesheet-extended.png`, 1536x2288, 8x11 cells of 192x208, SHA-256 4353761c...) replaces Riff in `Sprite.tsx`. Its manifest is copied to `public/mascot/greg.dot.json`. Riff's PNG stays in `public/mascot/riff.png` and `assets/riff/`. The denser 16-column six-state set stays optional (Trello V1-11) and must never be read with Dot geometry.
Why: Jason chose the Dot layout as main (9 actions + 16 look directions). The manifest matches `atlas.ts` for all nine action rows (row and every duration), so the swap is a PNG change.
Pinned by tests: exact checksum, RGBA dimensions, manifest == atlas, look rows = two rows of 8 fixed poses in 22.5 degree steps.
Checked 2026-10-15: 73 populated cells, unused cells empty, no cell-edge clipping (>= 6px margin), stable baselines; sprite code loads the sheet at 192x208 and the idle loop steps through 6 frames in a browser.
Known art issues (measured, not fixed): running-left is ~4.7 points lighter and far less saturated than the other rows; no sit->lie transition (the "thinking" row is a lying pose); no curled-up Rest in this sheet. Smoothness and Jason's visual approval: NOT assessed.
Reversible? Yes (one URL).

## 2026-10-15 — Panel hotfix H1 (from the flow audit)
Choice: both tabs stay mounted and are only hidden (draft, reply and expanded list survive a trip to Settings); the reply scrolls into view; the ask box takes focus on open and on window focus (never from a button); the panel is resizable (min 340x420, max 640x900), remembers its size in `panel-size.json`, shrinks to fit above Greg on short screens, and resizing from the top/left edge no longer drags Greg along (a "moved" event whose size changed is treated as a resize). Prompt: replies must name tasks by title, never by the internal t1/t2 refs (seen in a live run).
Verified in a browser against the real helper: before = 0 px of Claude's reply visible with 8 tasks; after = 232 of 232 px visible; focus, no focus-steal, draft/reply/list survive the tab switch.
NOT verified: resizing in the real Heel window, that Greg stays put, that the size is remembered after a restart, fit on a short screen. Rust logic is unit tested (16 tests).
Reversible? Yes.

## 2026-10-15 — Panel S2.1: chat-first layout (Mobbin references)
Choice: the panel is one conversation, not Today/Settings tabs. Header = title + model chip (opens Settings) + Close; Settings is a Back view. Body = one-line Now strip (circle completes it) → thread → folded "Tasks N · Parked M" drawer → floating Undo toast → chips → composer (Send beside the box). Patterns borrowed from Mobbin: Base44/Zapier Central (reply + collapsed action receipt), Unify (model label, state while it works), Todoist (Today list + complete-with-Undo toast), Evernote (collapsible groups), Devin (first-run checklist). Mobbin showed no first-run provider flow; that step is ours.
Behaviour: each AI write shows as a receipt line with its own Undo (complete/remove -> restore, add -> remove, park -> forget); failures name themselves and open by default. Failed turns stay in the thread with Try again. New messages follow only while at the bottom, otherwise "Jump to latest". A failed reload keeps stale tasks instead of blanking. The model sees the last 6 messages as context (clipped to 400 chars each, fenced as context, not instructions).
Agent: start_focus/end_focus removed from the model's actions until S6 (the model started a focus session unprompted). Receipts name tasks by title. `store.parked.unpark` added (DELETE ... WHERE id AND not promoted) as the undo for park.
Not built (see PARKED): Stop button (needs abort plumbing into the CLI/Ollama providers; a client-only "stop" would still apply writes), saved history across restarts, rounded transparent window with a tail toward Greg.
Verified in a browser at 380x620 against the real helper and real Claude: first-run -> Settings -> chip updates, a turn adds 2 tasks + parks 1 (receipt "2 things done"), receipt Undo restores a completed task, drawer complete + Undo, Make task, Park it + Undo, retry in place after the helper was stopped, scroll anchoring (scrolled up stays up, pill appears, pill returns to bottom). 197 tests + both typechecks pass.
NOT verified: in the real Heel window, keyboard-only use, screen readers, reduced motion, that the model's answer to a follow-up really uses the history (it answered correctly once; a prompt-level test only proves the text is sent), the 620px layout with the drawer open and a toast (tight but usable).
Reversible? Yes (git).
