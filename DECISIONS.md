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

## 2026-10-15 — S2.1 and H1 checked in the real Heel window (by Claude, no manual testing)
How: synthetic mouse/keyboard input is blocked on this Mac (no Accessibility permission for the host app), so a temporary driver ran JS inside the real WKWebView via Vite's HMR socket and the Tauri window API; window positions and sizes were read from the OS window list; screenshots via `screencapture`. The driver, its Vite plugin and its capability file were removed afterwards; the real `heel.db` was backed up and restored byte-identical.
Verified in the real window: panel reveals above Greg, right-aligned, ask box focused; chip shows the saved provider; a real Claude turn added 2 tasks + parked 1 and rendered thread + receipts; receipt Undo; drawer complete + Undo toast; Close button, Esc and a click on Greg hide/show the panel; resizing via the window API saves `panel-size.json` and the size comes back after an app restart; an oversized saved size is fitted on show and both windows stay on screen; Greg follows panel moves and the reverse; a full reload of the webview picks up new data from the real helper. Found and fixed: the focus ring on the ask box/chips was clipped at the panel edge (`--ring-room`).
NOT verified (cannot be driven without real input): a real mouse drag on the panel's top/left edge (events from the OS arrive atomically; the emulation splits them, so "Greg stays put while resizing" is still unproven), refresh on window focus, keyboard-only use, screen readers, reduced motion.
Observed, not fixed: with the panel open, Greg cannot be moved above (panel height + menu bar) because the panel follows, hits the menu bar, then pulls Greg back; with a 620px panel Greg stays in the lower third. See PARKED (flip the panel below Greg when there is no room above).

## 2026-10-15 — Menu bar: Settings item + Greg icons
Choice: the menu-bar menu is now Show / hide panel, Settings…, separator, Quit. "Settings…" opens the panel on its Settings view: Rust sets a pending view and emits `heel:open-settings`; the panel asks for the pending view on load and on each event (covers a panel that hasn't loaded yet). The menu-bar icon is a black sitting-Greg silhouette (44x44 raw RGBA, template image, so macOS tints it for light/dark bars). The app icon (Dock, .icns) is Greg's bust on the same off-white tile, replacing Riff. Both are generated from `assets/heel/animation-v1/references/canonical-base.png` by `src-tauri/icon-source/make_icons.py`; `npx tauri icon` produced the platform files (Android/iOS output deleted: macOS only).
Verified in the real app: the tray icon shows in the menu bar at real size; calling the same `open_settings` path opens Settings both when the panel was never loaded and when it was showing Chat. NOT verified: clicking the menu item itself and the Cmd+, hint (no synthetic input is possible here), the new .icns in the Dock/Finder, the silhouette's legibility to you (first pass, reads as a sitting dog with a narrow head). Not done: "Settings…" in the app's own menu (the Heel/File/Edit bar).
Reversible? Yes.

## 2026-10-15 — Design system: Radix Themes + radix-ui primitives, light/dark/system, small radii
Choice: Radix Themes 3.3.0 + radix-ui 1.8.1 (Collapsible, Toast, VisuallyHidden) + @radix-ui/react-icons 1.3.2, all exact-pinned, all MIT, React 19 supported (checked with `npm view` 2026-10-15). Theme: accent jade, gray sand (warm; fits Greg's charcoal and cream), radius small, solid panels. Light and dark both ship; "System" follows the Mac live; the choice is saved per window (appearance.ts, tested). Look borrowed from the Mobbin research (receipt cards: Base44/Zapier; checkbox rows + undo toast: Todoist; collapsible groups: Evernote; model chip: Unify/OpenAI).
Alternatives: shadcn/ui (needs Tailwind, copy-in code to own), Ark UI (more headless work). Radix Themes gives tokens, radii, themes and ready-made Button/TextArea/Checkbox/RadioCards/Select/Callout/SegmentedControl.
Cost: Radix Themes CSS ~100 KB; `npm audit` reports 3 dev-tool advisories (vitest/tinypool), unrelated to these packages, not fixed here.
Rules adopted (cards M1-M4): files <= 300 lines (soft 200), functions <= 50, no hard-coded colours/sizes/durations outside tokens, import boundaries enforced by tests.
Status: packages + theme logic + Notifier written and tested; component migration is D3-D5 (a first attempt was interrupted before it saved anything, so nothing half-migrated is in the tree).
Reversible? Yes (git).

## 2026-10-15 — Vanta: audit before any build
Jason wants Heel to do "basically everything" (texts, email/calendar alerts, cron jobs) by reusing Vanta's backend, or to become Vanta's avatar. Read-only look at ~/Documents/GitHub/_active/Vanta and docs/Vanta-company-api-20261013: Vanta already has messaging gateway, Google services, scheduled/ambient work, ACP server/client, a companion API with pairing + per-device tokens, R0-R5 autonomy with receipts, and a floating avatar. Plan: finish cards 01-22, then card 23 (V-AUDIT) decides between A companion pairing, B ACP provider, C avatar-merge; D (rebuild in Heel) is not recommended. No integration code before that decision.

## 2026-10-15 — B1 mic/dictation bug: click-through shipped; cause NOT confirmed
Report: while Heel runs, the mic controls/transcription in the Claude and Codex apps don't work. Checked: Heel holds no audio handle, no secure-input flag, no TCC log lines. Most plausible cause found in code: Greg's 192x208 transparent always-on-top window caught every click inside its rectangle, although the dog fills only ~116x165 of it (measured in the real window); anything underneath (e.g. a mic button) was dead there.
Shipped: the dog reports its opaque box per frame (hit-region.ts, sprite pixels, tested); Rust polls the pointer every 30 ms and makes the window click-through outside that box (+8px padding), never while pressing on Greg, never when the box is unknown (hit_region.rs, 4 tests). Verified in the real window: region reported (37,37 116x165), pointer maths right, ignore flips on when the pointer is outside. NOT verified: a click really reaching the app below, and that this fixes the mic problem (I cannot press a mic button or hear audio here).
Isolation switches if it persists: `HEEL_NO_HOTKEY=1` (skip the Cmd+Shift+H global shortcut), `HEEL_ACCESSORY=1` (no Dock icon, never takes app activation). Run `HEEL_NO_HOTKEY=1 npm run tauri dev` and retest the mic; then `HEEL_ACCESSORY=1`. Whichever fixes it is the cause.
Note: Vanta Desktop has its own dictation (Cmd+Shift+D); not suspected, listed in the Vanta audit.
Reversible? Yes.

## 2026-10-15 — D2-D7 done: Radix migration, light/dark/system, tokens only, contrast report
Built: the whole panel (header, chips, composer, Now strip, thread, receipts, task drawer, toast, first-run, Settings) now uses Radix Themes components and radix-ui primitives (Collapsible, Toast, VisuallyHidden) with the small radius. Light, dark and System (follows the Mac live) ship; Settings > Appearance switches at once and is remembered (verified in the real Heel window: both directions, localStorage). `src/styles.css` (654 lines) is gone; only `src/design/tokens.css` (raw values live here), `base.css` and three small layout files remain. The quality tests pass with an EMPTY design allowlist: no hex/px/ms literal anywhere else (quality/no-hardcoded-design.test.ts).
Contrast, measured in the real window with the Radix tokens actually in use (WCAG AA: text 4.5, UI 3):
 text   light / dark — body 16.3 / 16.3 · secondary 6.0 / 9.0 · placeholder 6.0 / 9.3 (was 3.9 / 4.5, fixed) · soft button 5.3 / 7.6 · high-contrast Send 16.0 / 16.3 (default solid jade + white was 3.15, fixed) · high-contrast badges 10.5-11.0 / 11.4-13.1 (were 4.3 / 8.0) · ghost Undo 4.8 / 10.3
 UI     light / dark — control border 3.3 / 3.7 (Radix default 1.6 / 2.1, raised via --gray-a7) · unchecked checkbox 3.9 / 4.5 (was 1.9 / 3.0) · focus ring 4.8 / 10.3 (was 2.4 / 3.9)
 Callouts now use high contrast (amber-12): the 4.28 light pair is gone.
Verified in the real window: both themes screenshotted for empty, thread + receipts, drawer + Undo toast, Settings; keyboard walk earlier (F9). NOT verified: contrast of every possible state (disabled controls are exempt, not measured), macOS "System" following a live OS appearance flip (code path only), VoiceOver. Tests: 217 JS, 24 Rust.
Left for later cards: M3 (lib.rs still 450 lines), size-allowlist hook/factory entries.
Reversible? Yes.

## 2026-10-15 — S6 focus time-box + S8 interrupt budget (built as one slice)
Choice: a box is one guess (15/25/45/60 min); the range is derived (best 0.7x, worst 1.5x, `shared/focus.ts`). At the realistic end the panel shows a check-in that quotes the goal verbatim: Done / Keep going (+gap to the worst case, min 5) / Park something and go back (saves the distraction to Parked, restarts a 10-min box). "Stop box" ends it as abandoned, no questions. Greg wears a focus pose while a box runs and gives ONE silent nudge pose at the end; he never opens the panel or makes a sound. The helper owns the budget: 3 nudges per local day, each reason spoken at most once a day (a restart can't repeat one). Off mode = no pose, no nudge. The check-in itself always waits in the panel, budget or not.
Alternatives: auto-open the panel at the end (rejected: an interruption); notification banner/sound (rejected: D4, no sound); poll-free timers in the shell (rejected: the helper already has the session and the budget).
Why: D4 says silent, speaks at time-box end or when opened, 3/day.
Reversible? Yes. Deviation from D4: the daily limit is a named constant (`DAILY_INTERRUPT_LIMIT`), not yet a setting, to avoid a settings UI before a real user wants one. Ratios and the return-box length are constants in `shared/focus.ts`.

## 2026-10-15 — V-AUDIT result: Vanta × Heel (PROPOSED, awaiting Jason)
Choice: recommend A (Heel pairs with Vanta's Companion API) after a 2-hour spike (X1); Vanta owns acting on the world (mail, texts, calendar, cron, approvals), Heel owns the ND layer and every Vanta push goes through Heel's 3/day budget. Not locked: nothing is built until Jason picks A / B / C.
Alternatives: B Vanta as an ACP provider (brain only); C Heel becomes Vanta's avatar; D rebuild in Heel (rejected).
Why: Vanta already has the pieces Jason listed (companion API, ACP, iMessage/email/Discord gateway, Gmail/Calendar/Drive, cron blueprints, autonomy lanes). Full evidence, gaps and open questions: docs/VANTA-INTEGRATION.md.
Reversible? Yes until C.

## 2026-10-15 — Vanta × Heel: two things, hook in, newest Vanta (DIRECTION, spike pending)
Choice: Heel stays its own app and hooks into Vanta (option A, companion pairing) rather than merging into Vanta now. Build against the newest Vanta: `~/Documents/GitHub/docs/Vanta-integration-20261013` (branch `claude/desktop-integration-20261013`, 2026-10-15), not `Vanta-company-api-20261013` or the `_active/Vanta` snapshot. Vanta owns acting on the world; Heel owns the ND layer and every Vanta push goes through Heel's 3/day budget.
Alternatives: merge into Vanta (C) — revisit after the spike; Vanta already has a thin Electron avatar window and wants an avatar "if cheap", so a lighter C (Greg's sprite player inside that window) is possible later. B (ACP brain only) is the fallback if A's approval flow is too heavy.
Why: cheapest way to learn whether Vanta's tools work through Heel; reversible, unlike a shell rewrite. Evidence: docs/VANTA-INTEGRATION.md.
Reversible? Yes. Open: whether Heel's work may change Vanta.

## 2026-10-15 — Secrets: scan, ignore, block
Choice: gitleaks scans history and tree on demand (`npm run secrets:scan`) and on every commit (`.githooks/pre-commit`, enabled with `git config core.hooksPath .githooks`, once per clone). `.gitignore` now covers env files, keys and certificates, databases, `sidecar.json` and logs. `.gitleaks.toml` allowlists only the fake test tokens and build output.
Audit result 2026-10-15: 42 commits and the working tree scanned; the only findings were fake test-fixture tokens and bytes inside ignored build output. No real secret was ever committed, so nothing needs rotating. Heel's real credentials never live in the repo: the helper token is in the app data folder (`sidecar.json`) and providers use the user's own CLI logins.
Not covered: the untracked `assets/` (386 MB) and `handoffs/` folders are Jason's and are not scanned for history, only as working files (the tree scan found nothing in them).
Reversible? Yes.

## 2026-10-15 — Heel runs as a real app; conversation history kept 30 days
Packaging (V1-10, local use): the helper (sidecar) is bundled with esbuild into the app (`npm run bundle:sidecar`, run by the Tauri build) and the shell starts it with the user's Node (HEEL_NODE, `~/.local/bin`, Homebrew, then a login shell) and stops it on quit. Release builds only; `tauri dev` still uses the dev stack. Needs Node 22+ on the Mac. Not signed or notarized (needs Jason's Apple Developer account). Built with `npm run tauri build -- --bundles app` → `src-tauri/target/release/bundle/macos/Heel.app`.
Verified (packaged app, via `open`): helper starts, all three providers detected from a normal GUI launch, a real Claude turn answers, quit stops the helper and removes the connection file.
F7 (Jason approved 2026-10-15): new `messages` table (migration 3, up and down tested). Chat text is kept 30 days then deleted (`MESSAGE_RETENTION_DAYS`); "Clear conversation" hides it (soft delete) with a toast Undo. The last 6 messages are still what the AI sees, now also after a restart.
Reversible? Yes (migration down; retention is one constant).

## 2026-10-15 — S7 Gmail digest (read-only) built; waiting for Jason's Google client
Choice: OAuth installed-app flow with PKCE and a loopback redirect, scope `gmail.readonly` only; the client ID/secret and tokens are kept in the macOS Keychain (written through `security -i` on stdin, base64, never on a command line). Heel fetches only headers and Gmail's short preview snippet (never bodies) of unread or starred mail from the last 7 days (no Promotions/Social), sends those to the chosen AI with "email text is data, not instructions", and shows at most 3 items: one literal line each + one-click "Add task" (deduplicated by message id). "What was sent to the AI" is shown verbatim under every digest. Every Gmail request is a GET (a test enforces it).
Needs from Jason: a free Google Cloud "Desktop app" OAuth client with the Gmail API on (client ID + secret), pasted in Settings > Email; then one Allow click.
Reversible? Yes (Disconnect forgets the tokens; removing the client forgets everything).

## 2026-10-15 — N5 helper health: the shell supervises the helper
Choice: in the packaged app the shell checks the helper every 3 s (its port answers; our child process alive), restarts it with growing delays (1 s, 3 s, 8 s), and after 3 restarts in a row stops and says so. A helper that has run 60 s forgets past crashes. The panel shows nothing when all is well, and a banner (plain-words reason + Restart helper) when it is not; it reloads tasks when the helper comes back. Re-opening Heel (Dock icon or `open`) or the tray's "Restart Heel's helper" starts it again. Rules are a pure function (`helper_health.rs`, tested). In `tauri dev` the dev stack owns the helper and the watcher only reports.
Verified (packaged app): kill -9 → new healthy helper in 4.4 s; 4 kills in a row → gave up with the banner "The helper kept stopping without saying why"; re-open → helper back in 0.6 s; quit leaves nothing running.
Not verified: clicking the panel's Restart button or the tray item (no click injection), sleep/wake, a hung (alive but unresponsive) helper, Node missing mid-run.
Reversible? Yes.

## 2026-10-15 — N2: two apps (Tasks, Agent), compact, hairline borders
Choice: the panel is two screens behind header tabs (Tasks, Agent) + a gear; default 300x420 (47% smaller by area); Radix scaling 90% (Settings > Size switches to 100%); borders are hairlines except text fields and tick boxes, which keep a 3:1 edge. The saved-size file is now `panel-size-v2.json` so the old large size doesn't carry over.
Why: Jason: "we need an agent app, a task app... this looks complicated"; "all the super dark lines across everything, you aren't keeping it elegant". My earlier fix made every border 3:1; WCAG 1.4.11 only requires that for the parts needed to use a control.
Evidence: docs/design/n2/. Reversible? Yes (tokens + one setting).

## 2026-10-15 — N2 second pass: one surface, a bar with + and one pill, four round buttons
Choice: no tabs. One screen: the latest reply (bubbles) above, the task list, and at the bottom a bar of + and one pill. The pill opens a Claude-iOS-style chat card; + pushes four round icon buttons out across the bar (Plan, Stuck, Email, Chat; inside the card: Add task, Park, Plan, Stuck) and they roll back when one is picked. Enter talks to Heel; ⌘↩ adds the text as a task at once; Esc closes. No accordions: receipts and Parked are plain lists. Everything animates in/out with token durations (0 under Reduce Motion).
Alternatives tried in the prototype (9 rounds): a mode button (Add/Ask/Park) + chips row; a dropdown menu; a tray above the bar; text pills. Jason rejected each as still too many controls or "poorly designed".
Why: "it should be one or two buttons, super simple, like the AI chat apps"; "four buttons, round, with icons, spread across the width". The Claude iOS composer was the named reference.
Cost: Enter now waits for the AI (N6's instant add moved to ⌘↩ / + › Add task). Swap is one line in `src/today/bar-model.ts` if S9 shows the wait hurts.
Evidence: docs/design/n2/README.md, prototype artifact 6uazHQ2GhAUqk7d32SkcKv. Reversible? Yes.

## 2026-10-15 — N11: mail through Apple Mail on this Mac, nothing sent without a preview
Choice: Heel reads unread mail, opens messages, replies and drafts through Apple Mail via macOS Automation (JXA over osascript), not through a Google OAuth client. Reading never changes anything. The AI may only *open* a draft (`draft_email`); a send happens only when the person presses Send on Heel's preview card (`POST /mail/reply/send`), which no other code path calls. "Open in Mail" leaves it unsent there.
Alternatives: Vanta's companion API (needs Vanta running; the spike showed it writes without asking); driving Gmail in the browser (fragile). Jason chose Apple Mail (his Gmail is set up in it).
Why: "we shouldn't have to give it Gmail code… just take control, open things, read things, write things if I want it, should show previews."
PRD change: "sends never" → "sends only after the person presses Send on a preview". The S7 Gmail OAuth code stays as a fallback, unwired.
Watch: in a real turn the model also completed an existing task while drafting. Receipts + Undo caught it; if it repeats, split "mail" turns from task writes in the prompt.
Evidence: docs/N11-MAIL.md. Reversible? Yes (routes and one action; nothing stored).

## 2026-10-15 — B2: the person's own words are never clamped
Choice: the green "what you asked" bubble wraps in full (no `-webkit-line-clamp`); the reply region already scrolls inside itself (`--reply-max-height`), so a long question costs scrolling, not truncation. Task titles keep the 2-line clamp because their text element carries no padding, so the ellipsis renders.
Why: `-webkit-line-clamp` clips at the content box but `overflow: hidden` clips at the padding box, so a padded bubble shows a sliced third line (Jason's screenshot). Clamping someone's own question also hides what the answer refers to.
Verified (real window, light + dark): a 192-character question shows 5 full lines, scrollHeight = clientHeight; a 170-character task title shows 2 lines with "…".
Reversible? Yes (one class).

## 2026-10-15 — N12: one notice system — a toast at the panel's top edge, a bubble next to Greg when it is closed
Choice: every transient message (Added / Parked / Completed / Removed with Undo, Sent, Opened in Mail, helper back, time-box started, a change in Settings) goes through one provider at the panel level (`src/ui/notices.tsx`). With the panel open it is a Radix toast that drops in from the top edge, stays 8 s (longer while hovered or focused), fades; only one at a time, a newer one replaces it and shows a count. With the panel closed the shell places a tiny always-on-top, non-focusable window (`notice`, 240×64) centred over Greg's head and the page in it shows the same words with Undo; the Undo comes back to the panel as an event by id, so no function ever crosses windows. Routing is a pure function (`routeNotice`): panel open → toast; Quiet mode (Greg Off) → nothing; a running time-box → nothing unless the notice is about that time-box; else bubble. An answer that lands with the panel closed becomes a bubble naming the first thing Heel did (with Undo); with the panel open the reply already shows it.
Alternatives: enlarging Greg's window to hold the bubble (touches hit-region, walking and docking; rejected); a native macOS notification (no Undo, leaves the app's look).
Why: Jason: "little toasts for some of these things, not all the notifications in the menu."
Verified (real window, tauri dev): ⌘↩ added a task → toast at the top edge with Undo, gone 8 s after the window had focus; with the panel closed, Heel completed a task on request → bubble "Completed "Fold the laundry". Undo" over Greg 3 s later, Undo restored the task and marked the receipt undone, the window hid; a direct checkbox completion from the hidden panel did the same; 0 ms tokens (reduced motion emulated) → instant in, still auto-hides.
Not verified: a Mac with Reduce Motion actually on; the packaged app; the count badge in the real window (unit-tested); one early run where the hide was reported late and no bubble came (not reproduced in three later runs).
Known limits: the bubble's Undo is pointer-only (its window never takes focus; open the panel within 8 s for the keyboard Undo); the bubble stays where Greg was when it appeared if he walks; Radix pauses the toast clock while the panel window is unfocused.
Reversible? Yes (provider + one window).

## 2026-10-15 — B4: the toast's clock belongs to Heel, not to Radix
Choice: the notice provider times every toast itself (8 s from show, held while hovered or focused, restarted when the panel comes on screen with a toast already set); Radix Toast only renders and announces (its own duration is set to "never"). Also: "Heel's helper is back" is only said after a stop or restart, never on a fresh launch (it had put a bubble next to Greg at startup).
Why: Radix pauses its timer whenever the window is unfocused and resumes only on a window `focus` event; a toast set while the panel was hidden (N12) or in an unfocused panel never left (Jason's screenshot: "Completed: Fold the laundry / Undo" stuck at the top).
Verified (real window): ⌘↩ added a task in an unfocused panel → the toast was gone 9 s later with no focus event.
Reversible? Yes.

## 2026-10-15 — N13: Greg shows work — a thought bubble, pacing when free, a sway when docked
Choice: the panel emits `heel:work` { id, active } when a turn, a digest or a reply draft begins and ends (`beginWork` in motion-events); Greg's window keeps the set of flights and is "working" while any is up (pure `applyWork`, tested: two at once is one state). What he shows is a pure policy (`workVisual`, tested): always a thought bubble (three pulsing dots, Radix-themed so it follows light/dark); with the panel closed he paces in short legs (96 px, the shell's walker, thinking pose between legs); with the panel open he sways in place (the panel is docked to him and would be dragged along); under Reduce Motion or Quiet mode (Greg Off) it is the bubble only. The work pose outranks his idle life; the existing done/failed beats still close the turn. A begin with no end is forgotten after 3 min (a reload mid-turn).
Alternatives: using `thinking()` = the Dot "running" pose alone (what we had; Jason: "barely visible"); clips from puppy-v1 (A8 is not integrated yet — pacing/sniff-trail become the loops when it lands, the policy does not change).
Verified (real window, tauri dev, probes of the sprite row and the window position): panel open → thinking pose + bubble + sway, no travel; panel closed → bubble + legs left/right within ~190 px, thinking pose between; answer landed → jump beat, bubble gone, back to idle; a forced failure (bogus Ollama model, then restored) → the failed pose and the panel's error; Quiet mode set from the panel → bubble + thinking pose, position unchanged. Screenshots n13-m1…m5 in the session scratchpad.
Not verified: a Mac with Reduce Motion really on (the policy branch is unit-tested and shares the Quiet path); a digest or a reply draft in flight (same code path as a turn, not exercised); the packaged app; two flights at once in the real window (unit-tested).
Known limits: in dev, React StrictMode runs the pacing effect twice, which can start the first leg twice (not in the packaged app); `walkFinished` resolves on any walk-finished event, so a stale one can end a leg early; the bubble sits at the window's top-right, not over the head of every pose.
Reversible? Yes.

## 2026-10-15 — N14: the panel is one stack of layers, each from its own side
Choice: Today (the tasks) is the base and never leaves. Settings slides in from the right over it and the base slips back (−8 px, 98.5 %, 45 % opacity, inert) like an iOS push; Email and a reply drop in from the top (16 px) and sit over the upper part of the tasks, which stay visible and dimmed below. Exits go back the way they came, quicker (260 ms in, 180 ms out, ease-out / ease-in; transform and opacity only). Back is the header button, Esc, or a two-finger swipe to the right; Forward (the header's › or a swipe left) returns what was just left; the header names where you are in a word. The bar stays at the bottom on every layer; 300 × 420 unchanged; the header keeps one height so nothing below ever moves. Under Reduce Motion every distance is 0 and the time is 150 ms: a cross-fade with the same stack and the same Back. The stack is a pure model (`src/ui/layers-model.ts`, 11 tests); the provider only adds the leaving animation and a fallback timer. A sent question opens the reply layer; after Back, a quiet "Last reply ›" row at the top of the list brings it back, so nothing is reachable only through Forward. Email opens its layer and reads the inbox; its Close pops the layer.
Alternatives: one scrolling column (what we had; Jason: "everything shouldn't be in one long vertical thing"); layers that each take the whole body (rejected in the prototype: a reply or the digest belongs over the tasks, not instead of them).
Why: Jason: "sliding panels that slide from left to right, that fade in; stuff that comes in from top to bottom; back/forward." Prototype approved 2026-10-15 (Design canvas, artboard "N14 — layers, back and forward").
Verified (real window, tauri dev, DOM and geometry probes + screenshots n14-*): Settings arrives with layer-in-right, the base pushed (matrix .985 / −8 px), header "‹ Back · Settings"; Back plays layer-out-right then the layer is gone and › Forward appears; Forward and Esc work; the bar stayed at y = 590 and the header at 32 px throughout (no layout jump); + › Email dropped the Email layer from the top with the base dimmed and Apple Mail's digest arrived inside it 8 s later; a sent question dropped the reply layer from the top, the answer landed in it, Back left the "Last reply" row (270 px wide, no overflow), the row reopened it; synthetic wheel deltas: −200 px = Back, +200 px = Forward, a vertical scroll did nothing; dark mode screenshots of Settings and the reply; 0 px / 150 ms tokens injected (Reduce Motion emulated): layer-in-right with no transform, out in 150 ms, gone. Fixed on the way: the old `.today > *` rule flattened the host to 96 px; Radix's shadow token drew a 1 px ring around a top layer (Jason: "weird bounding box").
Not verified: a real two-finger swipe (synthetic wheel only), a Mac with Reduce Motion really on, the Comfortable density, the packaged app, VoiceOver's reading of the layers (regions are labelled).
Reversible? Yes (the provider and one CSS file; the old column is one commit back).

## 2026-10-15 — A8: the puppy pack is Greg's art, one 2x WebP grid per clip, shown at logical size
Choice: `scripts/build-puppy-strips.py` turns the pack's 2x frames into 34 lossless WebP grids (16 columns, wrapping; 30 MB in public/mascot/puppy) and a generated manifest (`src/mascot/manifests/puppy.json`: frames, columns, per-frame ms, loop). The existing grid player plays them unchanged through a `wrap` flag (frames continue on the next row), each clip as its own sheet named `puppy:<clip>`, drawn with `background-size` at logical size so the 2x pixels land crisply on Retina and only the clip in play is decoded. The hit region samples the 2x image down to logical px (and caches per image, not per sheet id: all puppy clips share one id). Product states: idle, listening, focus, nudge, done (the tail wag, not the jump), wave, error-facepalm for a failed turn, sniff-search while Heel works (review when the panel is docked), walk-left/right for pacing legs with turn-around after a leg to the right. Idle life: the six quiet states, gaze targets from look-directions (22.5° steps clockwise from up, uncalibrated), lie-down → lying → wake-up → sit-down instead of hard cuts, sleep = lie-down → curl-up → rest, and new rare behaviours: play (ball then offer, or a bow), groom (scratch, yawn, stretch), sniff, nature (grass, a scent trail, pick up and carry a stick then chew it). Bathroom gags only with `localStorage["heel:gags"] = "on"` (a Settings switch comes with N4), and then rare. The pacing clip's own root travel is not used: the shell's walker owns screen travel (the pack's note: apply it once). The Dot and smooth sheets stay as fallbacks.
Why: Jason: "the softer rounded puppy-like Greg, and ALL animation families." WebP caps a side at 16383 px, so strips became grids; per-clip files keep memory to one clip (the three 2x atlas pages would decode to ~490 MB).
Verified (real window, tauri dev): the idle sprite is `/mascot/puppy/idle.webp` at 3072×208 logical; a held gaze pose captured from the screen at DPR 2 equals its 2x source frame (mean |diff| 0.07/255 over 23 848 opaque px, max 6, no even/odd row pattern: no stripes, no pixelation); the hit box computed the hook's way for that pose is (57,85)–(136,195) = the source frame's bounds; nap → lie-down → focus → curl-up → rest, wake → idle; walk → listening → walk-right with the window moving 1202→1320 → idle; work begun → walk-left/sniff-search/walk-right/turn-around legs with the bubble, ended → the tail wag; a forced failure → paw over face. Screenshots a8-*.png.
Not verified: every one of the 34 clips on screen (the engine picks them at random; each is on disk, parsed and in the manifest, 76 mascot tests); a Mac with Reduce Motion on (frame 0 held, as before); the packaged app; CPU over an hour of idle life (N9).
Known defects (art, from the pack's own review, unchanged): the turn's silhouette differs from the walk and can pop at the join (visible in pacing); rest can open an eye; gaze angles are not calibrated; curl-up has a raised intermediate pose; wake from sleep still hard-cuts to sitting (the wake-up clip plays only after the lie-down behaviour, not after a touch); jump, the head-tilt error and the pacing clip are not wired.
Reversible? Yes (HEEL_STATES and MOTIONS are two tables; the old sheets are still in the app).

## 2026-10-15 — N8 + N16: History and quiet encouragement — a daily count and a week of counts, no streaks, no points
Choice: finishing a task says the task and one short line in the toast ("Book the vet · One less.", "… · Two down.", "… · Three today."), never the same line twice in a row (pure `encouragement.ts`, tested); nothing is scored. The end of the list carries "N done today · History ›"; History is a layer from the right (N14 model): a seven-day strip of plain counts (an empty day is a dot, today is tinted) and the finished tasks by local day, newest first, each with Restore (toast "Back on the list: …" with Undo = complete it again). The helper owns the day: `GET /history?days=` (grouped by the Mac's local day, the week always seven days) and `doneToday` on `GET /tasks`; the model's snapshot gains one line, "Finished today: N", so "what did I finish today" can be answered. Jason's level, 2026-10-15: "daily count and a week view, no streaks or points." The record survives a restart because it is the task table itself (status done + completedAt); a restored task leaves the record.
Not in this slice (parked): parked ideas, time-box outcomes and Heel's own actions in History; encouragement on the AI's completions (they show as receipts); Greg's mood following the day.
Verified (real window): three completions → "Two down.", "One less.", "Ticked." with Undo; History from the right with the strip "F S S M T W T 4" and "Today · 4"; Restore → the task back on the list, the strip at 3, the toast with Undo; Back → "3 done today"; a page reload → still 3; `/history?days=7` returns the same. Fixed on the way: the done row's count was stale after a completion (now refreshed).
Not verified: a real app restart (the page reload reads the same table), days older than today (the store test covers grouping and the week), the "Finished today" line reaching an answer, Comfortable density.
Reversible? Yes.

## 2026-10-15 — N17: ways of working — one timer, one structure, one sizing, chosen in Settings and followed everywhere
Choice: `shared/method.ts` names every method the product knows (timers: time-box, Pomodoro; structures: none, Pickle jar, 1-3-5, Eisenhower, Frog; sizing: none, T-shirt) so the stored setting is stable, and `BUILT` says what can be picked today (time-box; none or Pickle jar; none or T-shirt); the rest is shown in Settings as "Later: …" and the helper refuses it with a sentence that says which slice brings it. The helper owns the setting (`GET/PUT /method`, a settings row) and the task fields: migration 4 adds nullable `size`, `bucket`, `estimate_min` to tasks (checked in code, not by constraints, so the migration goes down cleanly); `PATCH /tasks/:id` changes them; `add_task` from the model may set `size` and `bucket`. The panel keeps the method in one provider: the list groups by the structure's buckets ("Not sorted yet" last, empty groups left out), every row carries a bucket pill and a size pill (a tap walks to the next value and back to none, no toast: a tap is its own undo), Settings shows "what changes" in a sentence and every change has Undo. The model's snapshot gains one line ("Ways of working: Pickle jar: rocks first…; set bucket / size on add_task") and each task's marks (`[rock, M]`). The timer picker exists but only time-box is real until N18; the jar meter and capacity (N19) and the size → minutes mapping (N20) are their own cards.
Why: Jason: "incorporate different task methods — Pomodoro, the Pickle Jar theory, T-shirt sizing — add that to Settings and let users change it there; update the interface too." Schema change approved by Jason 2026-10-15 ("Yes: add nullable size, bucket and estimate_min…").
Verified (real window): Settings → Pickle jar then T-shirt → the sentence changed live, a toast "Ways of working changed" with Undo, `/method` saved; Today → "Not sorted yet" group with Bucket/Size pills on every row; the Now row's pills → Rock, XS; a later row's pill → it moved into "Rocks"; `/tasks` carries bucket/size; a page reload shows the same groups and pills.
Not verified: a real app restart (the reload reads the same rows); the model actually setting a bucket on add_task (schema and prompt line unit-tested only); the migration's down path on a real file (tested in memory); Comfortable density.
Reversible? Yes (migration 4 down; the setting row; the provider).
