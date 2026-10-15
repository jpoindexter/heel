# Vanta × Heel — audit and integration plan

Audit date 2026-10-15. Read-only pass over Vanta's source; nothing in Vanta was changed or run. Card 23 (V-AUDIT).

**Direction (Jason, 2026-10-15):** two things, Heel hooks into Vanta; merge later only if the hook-in shows it is worth it. Use the **newest Vanta**. **Still open:** may Heel's work change Vanta (question 2 at the end). First step: spike A (2 hours).

## Which Vanta (newest)
`~/Documents/GitHub/docs/` holds about 70 Vanta worktrees. The newest is **`Vanta-integration-20261013`**, branch `claude/desktop-integration-20261013`, last commit 2026-10-15 (`ad0a46ff`). That is the one to build against.
- The first pass of this audit read `Vanta-company-api-20261013` (2026-10-13). I re-checked the key facts against the newest tree: companion routes, port 7790, off by default, `gmail.modify` scope, iMessage adapter, automation blueprints and ACP are all unchanged.
- `~/Documents/GitHub/_active/Vanta` is only a workbench snapshot (no `package.json`, partial source, its own `AGENTS.md` says so). Not used.
- Paths below are relative to `Vanta-integration-20261013/vanta-ts/`.

## What the newest Vanta changed in my read
- **Vanta already has an avatar window**: `desktop-app/electron/vanta-avatar.mjs` + `avatar.html`. A 124x128 transparent always-on-top Electron window that only shows a connection "phase"; by its own comment it has no server, credentials, transcript, microphone or screen access.
- Vanta's own `DECISIONS.md` (2026-10-15, item 7) says a desktop agent (avatar or pet) is "wanted if cheap".
- The current desktop app is `desktop-next/` (an imported Hermes desktop, re-skinned, **Electron**), shipped as one app, `/Applications/Vanta.app`.
- So Heel-as-avatar is a realistic later step, in a lighter form than rewriting Heel: Greg's sprite player is plain web code (manifests + a sheet), so it could run inside that existing avatar window. The ND layer (Now, time-box, interrupt budget) would not come with it unless ported. That is why the order stays: hook in first, decide on merging after.

## What Vanta already does (file evidence)

| You asked for | Vanta has | Where | Catch |
|---|---|---|---|
| Talk to Vanta from another app | Companion API: pair with a code, then a per-device Bearer token. `status`, streaming `chat`, `approval` (get/post), `sessions` (list/new/open), `events` (SSE) | `src/companion/routes.ts`, `auth.ts` | **Off by default** (`enabled ?? false`), port 7790. Pairing can only be started from the same machine |
| Use Vanta as the "brain" | ACP server over stdio: `vanta acp serve`. Gated actions come out as `session/request_permission` | `src/acp/serve.ts`, `acp-server.ts` | One fresh Vanta conversation per prompt turn: stateless across the boundary |
| Check texts | iMessage adapter: sends with AppleScript, reads `~/Library/Messages/chat.db` | `src/gateway/platforms/imessage.ts` | Needs macOS **Full Disk Access** + Automation permission, granted to whatever process runs it |
| Other messaging | Email, Discord, Google Chat, Matrix, IRC, LINE, Mattermost, Feishu adapters (list was cut at 40 files; Slack lives in `src/comms/`) | `src/gateway/platforms/` | |
| New email / calendar | Google services: Gmail, Calendar, Drive | `src/google/capability.ts` | Scopes are **`gmail.modify`**, full Calendar, full Drive. Heel's PRD says never send or delete; Heel v0 planned `gmail.readonly` |
| Cron jobs | Automation blueprints: `schedule` (cron + instruction) and `webhook` kinds. Gateway "ticks" run them | `src/automation-blueprints/schema.ts`, `src/gateway/loops-tick.ts` | |
| "Tell me when X" | Standing-goal sentinels (a predicate command that is re-checked) | `src/goals/sentinel.ts` | |
| Who may act alone | Autonomy contract: lanes `acts-alone` / `queues-for-approval` / `wakes-me`, with trust tiers watch / queue / auto | `src/autonomy/contract.ts`, `trust.ts` | |
| Alerts | OS notifications | `src/term/notify.ts` | No feed an avatar could subscribe to was found |

## What I could not find
- A push feed of *new mail / new text / new invite* events for a client. The SSE `events` route carries chat and approval events of a session, not inbox events. **Heel would have to poll, or Vanta needs a small new endpoint.**
- How a `wakes-me` item reaches a UI other than an OS notification.
- Whether Vanta exposes its scheduled jobs for a client to create or list (blueprints are files in Vanta; no companion route for them).

## The real design question: who owns what
Heel's contract is "model proposes, app disposes": the model returns typed actions, Heel validates and applies them, every write has an Undo. Vanta's agent runs its own tools and has its own approvals and receipts. Two task lists and two approval systems would fight.

Proposed split (works for A, B and C):
- **Vanta owns acting on the world**: mail, texts, calendar, cron, approvals.
- **Heel owns the ND layer**: Now strip, time-box, check-ins, the interrupt budget, Greg. Anything Vanta wants to say to Jason goes through Heel's budget (3 a day) first, so Vanta cannot become the nagging thing Heel exists to avoid.
- Heel never holds Google or iMessage credentials. If Vanta does the Gmail work, Heel v0 slice S7 (read-only Gmail) is not needed.

## Options

| | A. Companion | B. ACP provider | C. Heel becomes Vanta's avatar |
|---|---|---|---|
| What | Heel pairs with Vanta as a device and talks to its Companion API | Heel adds "Vanta" as a fourth brain next to Claude / Codex / Ollama, spawning `vanta acp serve` | Move the mascot and panel into Vanta Desktop; Heel stops being a separate app |
| Gets Jason | Texts, mail, calendar, cron via Vanta's tools; Vanta's approvals; Heel's mascot | Vanta's model and prompt only, tools only if ACP surfaces them | One product |
| Heel code | A "Vanta" connection (pairing, Keychain token, streaming chat, approval pass-through) | One provider file (fits the existing `Provider` interface) | Rewrite Tauri/Rust parts for Electron, merge two stores |
| Main risk | Needs Vanta running with companion enabled; two sources of truth (see split above) | Heel's typed-action JSON contract and Vanta's free-form agent do not match; stateless per turn | Largest by far; throws away Heel's shell work |
| Effort (best / realistic / worst) | 2h / 1 day / 3 days, mostly the approval UI | 2h / 4h / 1 day | 1 week / 2–3 weeks / unbounded |
| Reversible | Yes | Yes | No |

**D. Rebuild Vanta's features inside Heel** — not recommended. It repeats what Vanta already has and breaks the anti-drift rule.

## Recommendation
**A, spike first (X1, time-box 2h):** enable the companion in Vanta, pair from Heel, send one streamed chat turn, show one Vanta approval in Heel. Pass = Heel renders a real Vanta answer and approves/denies a real gated action. Fail = fall back to B for "brain only".

Then, in order (these are the Trello cards under "After V-AUDIT"):
1. X1 spike as above.
2. X2 notifications feed — needs the missing inbox-events endpoint (Vanta-side) or polling; through Heel's interrupt budget.
3. X3 texts, read-only first (Vanta's iMessage adapter; the Full Disk Access prompt belongs to Vanta, not Heel).
4. X4 routines/cron: create and list blueprints from Heel (needs a Vanta route; none found).
5. X5 approvals pass-through.
6. X6 calendar and appointments.
Decide C only after X1–X3 show where the seams are.

## Open question for Jason
1. ~~Which Vanta?~~ Answered: the newest (`Vanta-integration-20261013`).
2. May Heel's work change Vanta (a small inbox-events route, a blueprint list/create route)? That branch is where other work is happening, so a change should go on its own branch and be reviewed by you. Until you say yes, the spike uses only what Vanta already exposes.

## X1 spike result (2026-10-15, stopped early on purpose)
Setup: isolated Vanta (`heel/x1-companion-spike`, worktree `docs/Vanta-heel-x1-20261015`), own home, own ephemeral kernel, local Ollama, loopback only. Nothing touched Jason's real Vanta data. Temporary tokens deleted.

**Worked (executed):**
- Pairing: 6-character code → device token; requests without a token get 401.
- One real chat turn through `POST /api/companion/chat` with the token: HTTP 200, Vanta's answer plus a Vanta receipt. 4–40 s on a cold local model.
- A tool call through the companion (`write_file`, `shell_cmd`) returns its steps in the receipt.

**Not observed:** a real Vanta *approval* request answered from outside. Five attempts did not raise one (see below), so `GET/POST /api/companion/approval` is read from the code only. The spike is not "passed" by its own Done line.

**Findings that matter for Heel's safety rules:**
1. Vanta wrote a file inside its project root and ran a shell `echo` with **no approval**, even after switching its access mode to `ask`. Heel cannot assume Vanta asks before acting.
2. Some actions the *model* refused in chat ("please confirm") instead of raising a formal approval; the kernel flatly denied `rm`. So "approval" is not one clean channel.
3. The native Vanta app starts with the companion **on** (`companion: !args.includes("--no-companion")`) and binds `0.0.0.0` (whole LAN); only the plain CLI is off by default. My earlier "off by default" was true only for the CLI. Pairing needs a code, but the exposure is real.
4. `/api/access-mode` is not a companion route: Heel cannot tighten Vanta's mode itself.
5. Vanta's `claude-code` provider reads the Claude OAuth token from the macOS Keychain (Vanta's own notes call it a grey area).
6. The pairing response lists LAN URLs even when bound to loopback (cosmetic).

**Vanta change made (own branch, not pushed):** `--companion-local` = companion on, 127.0.0.1 only. Additive, tested (`native-shell.test.ts`), Vanta's own commit hooks passed. `--companion` is unchanged.

## Scope decision: freeze here
Heel's PRD v0 is one real workday on Jason's Mac; that has not happened (S9). Texts, cron, calendar and Vanta pass-through (X2–X7) are platform work before one real user day. They are frozen until S9 is done and says it is needed. The finding above (Vanta acts without asking) also means X5/X6 need a design decision before any code.
