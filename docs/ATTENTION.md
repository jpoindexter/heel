# Attention sense (N24) — what Heel may see, and what it does with it

Jason, 2026-10-15: "track mouse movement and what the focus is, and use the ND skills to help rabbit holes, time suck, drifting."
This is the N24a spike: the evidence, the privacy contract, the rules. N24b builds from it and nothing else.

## 1. Signals, with evidence

A throwaway Swift probe (`scripts/attention-probe.swift`, 30 s, one sample every 5 s) on this Mac, 2026-10-15 22:40, with no permission dialog:

| Signal | API | Result |
|---|---|---|
| The app in front (name, bundle id) | `NSWorkspace.shared.frontmostApplication` | "ChatGPT (com.openai.codex)" each sample |
| Seconds since any input | `CGEventSource.secondsSinceLastEventType(.combinedSessionState, any)` | 124.7 s → 149.7 s across the run |
| Seconds since the mouse moved / a key | same, `.mouseMoved` / `.keyDown` | 395 s / 247 s (the person was in another input) |
| App switches per window | derived from the bundle id changing | 0 in the run |
| Cost | `ps` on the probe every 5 s | 0.0 % CPU, 10 MB resident |

Nothing above reads what is on screen, which window, or what was typed. None of it triggers a TCC prompt.

What needs the Accessibility permission (`AXUIElement`): the front window's title and a browser's URL. Decision: **not in v0**. A title or URL is content; the app name is enough for every rule below, and the Accessibility dialog is the one that scares people (and still blocks F5 here).

Vanta (`~/Documents/GitHub/_active/Vanta`, read-only): no `ambient/` module exists in that checkout today (the V-AUDIT card's listing came from an earlier tree); nothing to reuse. Heel's own sensor will be a Rust timer in the shell with the two calls above, behind a switch.

## 2. The privacy contract (written before the code)

- Off by default. One switch in Settings > Attention, with this exact list under it: "Heel reads which app is in front and how long since you last touched the mouse or keyboard. Nothing else. Nothing leaves this Mac."
- What is kept: per app, seconds in front, for the current day only, in the helper's settings row; never window titles, never URLs, never keystrokes, never screenshots.
- A "wander list" of apps the person edits (defaults: Safari, Chrome, Arc, Firefox, Messages, Slack, Discord, Mail, Twitter/X, YouTube by bundle id) — the only apps the rabbit-hole rule may name.
- The model never sees the log. If the person asks "where did my morning go", the answer comes from the per-app seconds, shown first in History ("where the day went" as plain counts), and only then sent, with the person's words.
- Every nudge is one bubble from Greg (N12), inside the interrupt budget (D4), never in Quiet mode, never during a Pomodoro break, never twice about the same thing within 30 min, and always with "Not now".

## 3. The rules (pure, `shared/attention.ts`, 7 tests)

| Rule | ND skill | Signal | Threshold | What Greg says | Choices |
|---|---|---|---|---|---|
| Rabbit hole | nd-research-gate, nd-taskboundary | a wander app in front during a box | max(15 min, half the box) continuous | "45 min in Safari during “invoice”. Back to it, or park what you found?" | Back to it · Park it · Not now |
| Time suck | nd-inhibit | app switches, no box | 12 in 5 min | "Lots of switching in the last five minutes. Pick one thing?" | Start: <Now task> · Not now |
| Drifting | nd-task-initiation | idle ≥ 20 min, then back (idle ≤ 5 s), no box, a Now task | on return only | "Back after 24 min. Still “invoice”?" | Start a box · Not now |
| Hyperfocus | nd-hyperfocus-guard, nd-time-blindness | a box past its worst case | worst + 10 min | "“invoice” has run past its worst case. Stretch, then keep going?" | Keep going · Stop the box |

Snooze: 30 min per rule. Quiet mode: nothing, but the state keeps folding so the day's counts stay right.

## 4. Cost

A 5 s tick with two Cocoa calls is below measurement here (0.0 % in the probe). In the shell it rides the existing 30 ms hit-region poll's thread or a separate 5 s timer; the N9 idle budget (≤ 0.5 %) is not threatened. Memory: one small struct.

## 5. N24b, from this

Rust: `attention.rs` — the switch (from the helper's settings), a 5 s timer, `frontmostApplication` + `secondsSinceLastEventType` through `objc2-app-kit` / `core-graphics`, emits `heel:attention` { bundle, name, idleSec } to the panel. Helper: `POST /attention/sample` folds it with `decideAttention` into a state row, keeps per-app seconds for the day, spends the interrupt budget when a nudge is due, and returns the nudge; `GET /attention/day` for History. Panel: the switch and the wander list in Settings; a nudge becomes an N12 notice with buttons (new: a notice with choices); "where the day went" in History. Greg: the nudge pose. Verification: the DONE line of N24b.
