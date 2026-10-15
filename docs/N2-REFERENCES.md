# N2 redesign — Mobbin references (2026-10-15)

Goal (Jason): Heel's interface is too big; make it small and compact. This file is step 2 of card N2 (research). Step 1 (measure the friend's panel) is **blocked until the screenshots are in `assets/reference/friend/`**: Mobbin returns full-size web apps, so it gives patterns, not the target size.

Searched: compact task popover + quick add; small AI chat widget; quick-capture popup; compact settings. The one idea taken from each:

| # | Reference | Idea to take | Where in Heel |
|---|---|---|---|
| 1 | [Gumloop command palette](https://mobbin.com/screens/e9e0911a-09a4-4c72-bb98-6ac9357fa590) | One input on top, grouped actions below, a key hint at the right of each row (`Open ↵`). | Merge "Add a task" and the ask box into one field with a visible mode (Add / Ask), Tab switches; saves a whole row. |
| 2 | [Mintlify search](https://mobbin.com/screens/7c7ad31f-9dfe-4be7-83d7-6002fe31d4d0) | A card about 440 px wide, section labels, and a one-line footer with key hints (Select, Open). | Panel footer: `⌘N add · ⏎ send · esc close` replaces the three chips' visual weight. |
| 3 | [Unify clarifying question](https://mobbin.com/screens/ca1f0060-e1ab-4ba2-98f9-6a9789f2afc4) | Compact card, numbered options (1 2 3 on the right), `Skip` / `Next`. | Focus check-in: answer with keys 1/2/3 (Done / Keep going / Park). |
| 4 | [hilos task list](https://mobbin.com/screens/41e45f6c-23fd-4a5d-8224-186b88217b31) | ~28 px rows, group headers with a count, one "recommended next" card. | Task drawer rows at 28–32 px; "Done today (3)" fold (N8). |
| 5 | [Tana to-do](https://mobbin.com/screens/f4e8c898-6d90-4bca-8709-294de3effd2f) | A tiny `+` at the group header adds inline, no separate form. | Quick add lives in the Tasks header, not as its own row. |
| 6 | [Devin chat](https://mobbin.com/screens/a0f522a3-cfd9-4429-b994-e120719622cc) | Steps collapse to one line ("Worked for 11s") and expand on demand; composer is one slim box with tiny controls. | Receipts already collapse; make "Thinking" and receipts one line; slim composer (1 row, grows). |
| 7 | [Copilot Money settings](https://mobbin.com/screens/463bedb0-2bb9-46c7-b7ba-9877ca9c1389) | Two-level settings: left list (General, Connections, Account, About), rows with label + helper left and the control right; tiny segmented control for Light / Auto / Dark. | N4: at 300 px the left list becomes a top row of small tabs; rows keep label-left, control-right. |
| 8 | [hilos preferences](https://mobbin.com/screens/7024bdca-6ffb-4d8a-8a5d-56ea38a52a86) | "Text size: Tiny / Regular / Large / Extra large" as a segmented control, plus Mode and Style. | Settings > Appearance: add **Density: Compact / Comfortable** (default Compact). |
| 9 | [Higgsfield settings dialog](https://mobbin.com/screens/8e6b81ce-2c86-467b-876f-a1fe259906ee) | A ~250 px dialog: tabs on top, then rows of icon + title + one-line helper, a small dropdown at the right, Reset / Save. | Each Settings group opens as a compact sheet instead of one long scroll. |

## Compact spec to test (from the references + Jason's brief; the friend's screenshots will correct it)
- Default panel 300 x 420 = 126,000 px² against 235,600 px² today (380 x 620), i.e. 47 % smaller by area (the card asks for at least 40 %); still resizable and remembered; min 280 x 320.
- Body 13 px, secondary 12 px, rows 28–32 px, controls 28–32 px with at least 24 px hit area and 4 px gaps (WCAG 2.2 target size minimum).
- One input (Add / Ask) + one footer line of key hints; chips become a single 3-icon row or move into the input's mode switch.
- Now strip is one line; time-box starts from it; Gmail, check-in and helper notices are single compact cards that replace each other (never stack).
- Radix Themes `scaling="90%"` plus tokens; no hard-coded values; light and dark both checked; contrast stays AA.

## Before shot (for the before/after)
380 x 620 panel, 16 px padding, three stacked 44 px control rows (Add, chips, ask box), full-width Now strip, separate "Start a time-box" button row. Captured in this session's screenshots (not saved to the repo).
