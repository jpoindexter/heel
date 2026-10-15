# N11 — Mail on this Mac (2026-10-15)

Jason: "we shouldn't have to give it Gmail code. It should work like Vanta and other things and just take control: open things, read things, write things if I want it. Should show previews." Chosen path: **Apple Mail through macOS Automation** (his Gmail is set up in Apple Mail). The S7 Gmail OAuth path stays in the repo as a fallback and is not wired to the panel any more.

## What Heel can do now
| Ask | What happens | Setup |
|---|---|---|
| **Email** (+ › Email) | Unread mail from the last 7 days, every account's inbox, newest first, at most 15 looked at; the AI picks ≤3 that need you, one literal line each; Add task / Open / Reply | none; the first time, macOS asks once to let Heel control Mail |
| **Open** | the message opens in Mail (`open message://<Message-ID>`) | — |
| **Reply** | you say what to say in a few words → the AI drafts it → a preview card with the editable text → **Send** sends it from Mail, **Open in Mail** puts it in Mail unsent for you to finish, **Not now** drops it | — |
| "Draft an email to my vet…" in the chat | the AI returns a `draft_email` action → a filled-in draft opens in Mail (to, subject, body); the receipt says *Opened a draft in Mail: "…". Not sent.* | — |

Rules that hold everywhere: reading never changes Mail; nothing is sent except by `POST /mail/reply/send`, which only the preview's Send button calls; the AI can never send (its only mail action opens a draft); what was sent to the AI is listed under every digest (sender, subject, first 300 characters of each unread email) and every draft; email text is given to the model as data, not instructions.

## How
- `sidecar/mail/scripts.ts`: three JXA scripts (`LIST_UNREAD`, `REPLY`, `NEW_DRAFT`) as plain strings. `jxa.ts` runs them with `/usr/bin/osascript -l JavaScript -e <script> -- <json>` (no shell), 45 s timeout, bounded output; the macOS refusal (-1743) becomes "macOS hasn't allowed Heel to talk to Mail. System Settings › Privacy & Security › Automation › Heel › Mail."
- `source.ts`: `MailSource` (candidates / open / reply / draft) for Apple Mail, plus `fakeMail` for tests. `draft.ts`: the reply prompt and parser (≤120 words, plain text, no invented facts).
- Routes: `GET /mail/status` (Mail.app on disk, Mail not touched), `POST /mail/digest`, `/mail/open`, `/mail/reply/draft`, `/mail/reply/open` (send:false), `/mail/reply/send` (send:true).
- Agent: `draft_email {to?, subject, body}` in `sidecar/agent/actions.ts`; `executeActions` is now async and takes `{ mail }` as a side effect; the prompt tells the model it opens a draft and never sends.
- Panel: `src/inbox/useMail.ts` (status, reply flow, open), `ReplyFlow.tsx` (ask → drafting → preview), `InboxPanel.tsx` (Add task / Open / Reply per item).

## Verified on Jason's Mac (executed)
- JXA counts 3 accounts, 1 unread in 7 days, 3.2 s, no prompt from this shell.
- Real panel: + › Email → "Reading your inbox…" → "Nothing needs you right now (1 recent unread email looked at)" with the what-was-sent line (the AI judged the one unread as not needing action).
- `POST /mail/reply/open` on that real message with `send:false`: a reply window opened in Mail (outgoing 0 → 1), then closed by the test; nothing sent. `POST /mail/open`: ok. Unknown id → "That email isn't in your inbox any more."
- Real turn "Draft an email to my vet…": the model returned `draft_email`; a filled-in draft opened in Mail (outgoing 0 → 1), receipt "Opened a draft in Mail: 'Check-up appointment for Greg'. Not sent."; closed by the test.
- 406 tests, typecheck on all three projects.

## Not verified
- **Send** on a real reply (never pressed on real mail; the route is covered by tests with a fake Mail and the JXA `send()` call is the same path as `reply` with `send:false`, which did run).
- The one-time macOS Automation prompt in the **packaged** app (this shell already had permission). First use in Heel.app will show it; the "not allowed" sentence is tested, not seen.
- The Reply UI (ask → preview) in the real window: no actionable item was available, so it ran against fake Mail in tests only.
- Calendar and Messages: next slice. A Mac without Mail: `available:false` → Email dims and opens Settings.

## Lesson
The AI completed Jason's real "Schedule dog vet appointment" task while drafting (it took "draft an email" as finishing the task). Restored at once via the receipt's Undo. Follow-up noted in DECISIONS: a mail action should not be bundled with task writes unless asked.
