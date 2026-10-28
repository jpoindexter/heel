# ND spec: friend's companion -> Heel

Source: four screenshots of a friend's Bunny/Owl desktop companion, plus [nd-skills](../skills/nd-skills/SOURCE.md) (vendored, pinned). The nd-skills are the agent's behavior core; the UI exists to deliver them.

## What her app shows (observed in screenshots)
- Mascot sits at bottom-right; panel pops above it with a tail pointing at the mascot.
- Header = mascot name + close X. Task list = checkbox + text + small x, scrollable.
- Chip row + "Ask me anything..." box + Send button.
- Day persona (Bunny) chips: Ideas, Newsletter?, Caption / To do, Hat, Focus. Night persona (Owl): Tonight, Plan my night, Add. Chips and colour change with persona.
- Task text looks agent-cleaned ("send Finn and Aoi questions..." later reads "Email Finn and Aoi with questions..."). Inferred, not confirmed.

## What I'd fix (design-skill checks)
| Seen | Problem | Heel |
|---|---|---|
| Blurry dark panel, light text | contrast unverifiable, tiring | opaque panel, AA verified (4.5:1 text, 3:1 UI) |
| Long URL fills 5 lines | wall of text | wrap + truncate, full text on expand |
| List cut mid-row behind chips | no end cue | fade + "3 more" row |
| Placeholder-only input | no persistent label | visible label "Ask Heel" above field |
| Tiny x and checkbox | motor/target | 44px hit areas (24px visual) |
| Chip "Newsletter?" | unclear, punctuation as label | verb-led labels, sentence case |
| Chips swap per persona | positions move | persona changes colour/art, never chip positions |
| x deletes | no recovery | delete + 8s "Undo", no confirm dialog |

## Expansion: each Heel feature -> nd skill -> design rule
| Heel feature | nd-skills | Design/spec rule |
|---|---|---|
| Panel shows ONE "Now" step, Today max 3, rest folded ("4 more") | nd-choicereduce, nd-task-initiation | hierarchy: Now = primary tier, Today = secondary, rest tertiary; squint test |
| Brain-dump capture (hotkey) splits into tasks + one first action | nd-task-decomposition, nd-task-initiation | never ask "what do you want to do?"; propose the step |
| Focus: set goal + time range, end check-in "where are you vs [goal verbatim]" | nd-time-blindness, nd-hyperfocus-guard, nd-taskboundary | check-in = 3 buttons: Continue / Park and return / Done. No moralizing |
| "Park it" chip saves a distraction to Parked without leaving the page | nd-hyperfocus-guard, nd-velocity-check | one tap, toast with Undo, shown count not guilt |
| "Stuck" chip | nd-task-initiation, nd-setshift | replies with one reversible action, not options |
| "Overwhelmed" and Low-capacity mode (user-set, never inferred) | nd-functional-minimums, nd-emotion-regulation, nd-sensory-load | one task, no chips, shortest copy; mascot in REST pose |
| "Plan" chip (day or evening) | nd-task-decomposition, nd-goal-persistence | terminal condition stays visible until done or dropped |
| End of day / switching tasks | nd-closuregate, nd-working-memory | surfaces >50%-done items; writes re-entry line for tomorrow |
| Inbox digest (v0 read-only) | nd-task-initiation, nd-sensory-load | <=3 actions, literal one-line summary, "Add as task" |
| "What do they mean / do I need to reply / how do I say it" (V1-3, built 2026-10-28) | autism-layer (literal four lines, scripts with a Tone line, invitations not orders, special interests parked with a play slot, masking → Low capacity) | the skill in skills/nd-skills/autism-layer; transition warnings 10/5/1 parked under D4 |
| Interrupt budget + Off | nd-sensory-load, nd-selfmonitor | silent default, no sound, 3/day, Off removes all optional UI |

Default chips (fixed positions, max 3): **Plan**, **Stuck**, **Park it**. Evening swaps labels only (Plan -> Wind down). Other actions via a "More" chip.

## Component spec (components-and-states, accessibility)
- Task row states: rest, hover, focus-visible (2px ring, 2px offset, 3:1), done, removing (Undo available), editing, error (e.g. "Couldn't save. Try again."). Precedence: disabled > loading > error > selected > focus-visible > hover.
- Mascot window: role=img, label states what click does; click opens panel; drag after 4px. Keyboard: Cmd+Shift+H toggles, Esc closes and returns focus, Cmd+Enter sends.
- Reduced motion: no idle loop, single frame; one-shot states become a still pose.
- Colour never alone: done = check + strike-through; error = icon + text.
- Targets: 44x44 hit area, 8px gaps. Panel opaque, 320-360px wide, content-out heights (no fixed heights on text).

## Copy rules (ux-writing)
Sentence case, verb-led buttons, plain words, no exclamation marks, no streaks, no "you failed". Errors say what happened, why, how to fix. Empty state: "Nothing queued. Press Cmd+Shift+H, then type what's on your mind."

## Not yet decided
Mascot art: Riff sheet is the placeholder; Greg sheet in progress elsewhere. Persona skins (day/night): parked to v2.

## Settings tab (panel tabs: Today | Settings)
Built per slice, not as one big slice: each feature ships its own setting. Defaults must work with zero settings touched.

| Group | Controls | Ships with |
|---|---|---|
| Brain | Agent/provider: Claude (subscription CLI), Codex (subscription CLI), Local (Ollama), API key. Model picker filled from what the provider reports (Ollama list, API models list; CLI default otherwise). "Test connection" button. Shows signed-in / not installed / sign-in required per provider. | S4 (v0, minimal) |
| Privacy | "What was sent" log, per-source toggles (Inbox on/off), Data location, Export, Delete all | S7 / v1 |
| Quiet | Interrupt budget (default 3/day), quiet hours, sound (default off), Off mode | S8 |
| Capacity | Normal / Low / Off, set by user only | built (V1-7, 2026-10-28): Settings › Ways of working › Today's capacity |
| Mascot | Character (Riff now, Greg when ready), size, reset position, launch at login, hotkey | S1 follow-up |
| Skills | List of vendored nd-skills, on/off each, read text. Transparency, not tuning | v1 |

Rules: sentence-case labels, one setting per row with helper text, changes apply immediately with Undo (no Save button), every control keyboard-reachable, destructive items (Delete all data) grouped last with a named-consequence confirmation ("Delete all tasks and notes? This can't be undone. [Delete data] [Keep]"). Never list a model that the provider didn't report.
