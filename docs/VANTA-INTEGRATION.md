# Vanta × Heel — audit and integration plan

Audit date 2026-10-15. Read-only pass over Vanta's source; nothing in Vanta was changed or run. Card 23 (V-AUDIT).

**Decision needed from Jason:** pick A, B or C below (recommendation: **A, as a 2-hour spike first**). Two facts only Jason knows are listed at the end.

## Where I looked
- `~/Documents/GitHub/docs/Vanta-company-api-20261013/vanta-ts/src` — the full TypeScript runtime (this is where everything below was found).
- `~/Documents/GitHub/_active/Vanta` — only a desktop *workbench snapshot*: no `package.json`, partial `src`. Its own `AGENTS.md` says so. Not used as evidence.
- Not verified: which of those two is the Vanta you actually run day to day.

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

## Questions only Jason can answer
1. Which Vanta do you actually run: `docs/Vanta-company-api-20261013` (full source) or `_active/Vanta` (snapshot)?
2. May I change Vanta (a small inbox-events route, a blueprint list/create route), or is it frozen for now?
