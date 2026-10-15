# N2 — the single-surface panel (2026-10-15, second pass)

Jason's direction, in order: "too many buttons, simplify as much as possible" → "think of it like a sleek iPhone app" (interactions, not the black) → "one or two buttons, maybe a type thing; look at the AI chat apps and help bots" → "the Claude iOS app screenshots look pretty close" → "four round buttons with icons: Plan, Stuck, Email, Chat, spread across the width". Nine prototype rounds in a clickable Design artifact (`https://claude.ai/artifact/6uazHQ2GhAUqk7d32SkcKv`, v9 = this build).

| | First pass (tabs) | Now |
|---|---|---|
| Screens | Tasks tab, Agent tab, Settings | **One surface** + Settings behind the gear |
| Bottom | Add field + Add button (Tasks); 3 chips + ask box + Send + provider link (Agent) | **+ and one pill.** The pill opens the chat card (Claude iOS shape: text, then + · hint · Send). + pushes **four round icon buttons** out across the bar: Plan, Stuck, Email, Chat. Inside the card the four are Add task, Park, Plan, Stuck |
| Enter | adds a task (Tasks) / asks (Agent) | **talks to Heel**. ⌘↩ adds the text as a task at once (no AI). Esc closes the card |
| Reply | a scrolling conversation | the **latest exchange only**: what you asked as a small bubble on the right, Heel's answer on the left, receipts as one line each with Undo, a × to put it away (Undo) |
| Tasks | rows with a × each | card rows; Now is the one tinted row with a clock (time-box); the × shows on hover/focus; titles clamp to 2 lines; the list fades at its bottom edge |
| Parked | a fold-away (accordion) | a quiet "Parked" section, dimmer, "Make task" on hover/focus. **No accordions anywhere** |
| Motion | none | everything rises in (220 ms, ease-out) and sinks out (160 ms, ease-in); the four buttons roll out 40 ms apart and roll back last-first; Thinking pulses; press = scale 0.96; the card folds back ~2.5 s after you leave it empty (0.9 s after sending). All durations are tokens and go to 0 under Reduce Motion |

Screens (real window): `bar-light.png` (folded), `tray-light.png` (+ open), `reply-light.png` (a real Claude answer that also updated the Now step), `tray-dark.png`.

## Decisions
- **Enter = Heel.** This flips N6: the instant, no-AI add is now ⌘↩ or + › Add task. Jason chose the Claude/ChatGPT model knowingly; if the 5–40 s wait on Enter hurts in a real day (S9), swap the two in `bar-model.ts` (`barKey`) — one line.
- **Four, always four.** The tray is a 4-column grid that takes the bar's width, so the buttons spread with the panel (resizable, min 280 px). Email is dimmed when Gmail isn't connected and opens Settings instead.
- **Receipts and Parked are plain lists**, not folds: fewer controls, nothing hidden.
- **References that shaped it:** Claude iOS composer (card shape, round send), ChatGPT iOS (+ and Ask box), Intercom Fin / Copilot (greeting + few suggestion chips), Notion/Otter/Noom task lists on Mobbin (one plain list, checkbox left, tiny × right). The dark phone shots Jason sent were for the interaction style, not the colour: the panel still follows the Mac.

## Verified (real window, light and dark)
Chat opens the card with the box focused · ⌘↩ added "Call the printer about the proofs" with Undo · the card's four buttons are Add task / Park / Plan / Stuck · Park worked (toast + Undo) · the card folded back on its own · Enter sent a real question: the pill said "Heel is thinking…" with Stop, the answer came back as bubbles with one receipt (Heel updated the Now step) · completing a row fades it then shows Undo · closing the reply fades it then shows Undo · Cmd+N opens the card focused from anywhere · Esc closes it.

## Not verified
VoiceOver with the new bar (the four buttons have names; the tray is a group) · the roll animations at a real 60 fps (judged by DOM state, not frames) · a Mac with Reduce Motion on (tokens go to 0 ms; not toggled live) · Comfortable size · the check-in card's new entrance · packaged app: see the N2 card comment.
