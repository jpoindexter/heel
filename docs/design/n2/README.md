# N2 — the compact redesign (2026-10-15)

Jason's direction: it should be **an agent app and a task app**, small, simple, "not complicated", with no heavy dark lines.

| | Before | After |
|---|---|---|
| Default panel | 380 x 620 (235,600 px²) | 300 x 420 (126,000 px²): **47 % smaller** |
| Minimum | 340 x 420 | 280 x 320 |
| Structure | One screen: Now strip, time-box button, conversation, Tasks drawer, Add field, 3 chips, ask box | Two screens, one purpose each: **Tasks** and **Agent** (tabs in the header), plus Settings behind the gear |
| Tasks screen | (inside the drawer) | Add field, the Now task, the other open tasks, Parked fold; Gmail "Check email" only when connected |
| Agent screen | (crowded with tasks) | Conversation + one box; the 3 starters appear only while the conversation is empty; which AI is a small link |
| Time-box | Its own button row | A small link under Now; the running box / check-in shows above either screen |
| Row / control height | 44 px rows, 40 px buttons | 32 px rows, 24–32 px controls |
| Scale | 100 % | Radix `scaling` 90 % (Settings > Size: Compact / Comfortable) |
| Lines | Every Radix border darkened to reach 3:1 | Hairlines (`--hairline`, gray-5); only text fields and tick boxes keep a 3:1 edge |

Screens (real window, light + dark): `tasks-light.png`, `agent-light.png`, `settings-light.png`, `tasks-dark.png`.
The "before" shot was not kept (a macOS volume pop-up covered the top of it); the table above is from the code and window sizes.

## Decisions
- **Tabs, not one stacked screen.** An ND brain gets one job per screen. Tasks first (the thing used all day), Agent second.
- **Hairlines.** WCAG 1.4.11 needs 3:1 only for the parts you must see to *use* a control. Decorative frames, cards and separators don't. Fields and tick boxes keep 3:1; if that is still too firm, `--gray-a9` in the scoped block at the bottom of `src/design/tokens.css` can be stepped down (it would then be below 3:1 for those two).
- **The friend's screenshots were not used**: they never arrived (`assets/reference/friend/` doesn't exist) and Jason said they aren't the point. Mobbin references are in `../../N2-REFERENCES.md`.

## Not done / not verified
- Radix `scaling` 90 % + 12–14 px text was judged by eye in the real window only; no VoiceOver pass on the new tabs.
- The Settings screen is still one long scroll (compact, but not yet the two-level sheet in N4).
- The merged Add/Ask single field from the references was *not* built: two separate boxes (Add on Tasks, Ask on Agent) is simpler for now.
- Comfortable size was not screenshotted.
