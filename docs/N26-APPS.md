# N26 — Calendar, Reminders and Notes on this Mac (2026-10-27)

Same pattern as [N11 Mail](N11-MAIL.md): Apple's apps through macOS Automation (JXA in `osascript`), no keys, no consoles. Reading never changes anything; a write is proposed by the model, shown as a preview, and happens only when the person taps.

## What Heel can do
| Ask | What happens |
|---|---|
| "what's on my calendar this week?", "any meetings tomorrow?" | the next 7 days of events from every calendar (not Siri Suggestions / Scheduled Reminders) go to the model as data; the answer names them by title and time; "Used: calendar" |
| "what reminders are open?", "remind me…" | the open reminders from every list, soonest first; "Used: reminders" |
| "which notes did I change lately?", "make a note called…" | titles only of notes changed in the last 30 days (a note's text never reaches the model); "Used: notes" |
| "put the dentist in my calendar Thursday at 10" | a receipt *Add to Calendar? "Dentist" — Thu 29 Oct 10:00–11:00* with an **Add to Calendar** button; the tap writes it to the first writable calendar; the receipt becomes *Added to Calendar (Calendar): …* with **Undo** |
| "remind me to call the vet tomorrow at 9" | the same, **Add to Reminders** (default list; a date without a time is an all-day reminder) |
| "make a note called X saying…" | the same, **Add to Notes** (default folder); Undo moves it to Recently Deleted |

## How
- `sidecar/apps/scripts.ts`: one JXA script per app with `op: list | add | remove`. `source.ts`: `appleApps` (events are cached 10 min: Calendar checks every event for a date query, 35–95 s on a 1,400-event calendar) and `fakeApps` for tests. `preview.ts`: the receipt words, the same before and after the tap. `sections.ts`: the intent words and the prompt sections (`c1…`, `r1…`, `n1…`) plus the `Now:` line.
- Actions `add_event {title, start, end?, location?, notes?}`, `add_reminder {title, due?, notes?}`, `add_note {title, body}` in `sidecar/agent/actions.ts`; dates are local `YYYY-MM-DD` (all day) or `YYYY-MM-DDTHH:mm`. `execute.ts` turns them into proposals (`proposal` on the outcome), never writes.
- Routes: `POST /apps/write {write}` → `{id, undo, message}`; `POST /apps/remove {kind, id}` (Undo). Panel: `useReceiptConfirm.ts`, the button in `Receipts.tsx`, `undo.ts` for the three new undo kinds.
- `src-tauri/Info.plist`: `NSAppleEventsUsageDescription`, required for macOS to show the Automation prompt at all.

## Verified on Jason's Mac (executed, tauri dev, Claude brain)
Reminders read in a real turn (the two real open reminders named). Three proposals from one message; each tap wrote the real item (checked by id in each app); each Undo removed it (checked by id). The Calendar list script returned the real week standalone.

## Not verified
A Calendar read completing inside a turn with the final script (the in-app attempts overlapped and timed out before the fix); the packaged app's first-use Automation prompts for Calendar, Reminders and Notes; recurring events only show on their first date (JXA lists the master event, not its occurrences).
