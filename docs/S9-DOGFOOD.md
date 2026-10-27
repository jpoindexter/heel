# S9 — one real workday with Heel (the v0 gate)

Everything on the board is "built" until this day says it is "done". Jason runs it; Heel's job is to stay out of the way. One page, so it actually gets used.

## Before the day (10 min, the evening before)
1. Build and open it: `npm run smoke && npm run tauri build -- --bundles app`, then `open src-tauri/target/release/bundle/macos/Heel.app`.
2. Settings › Brain: the AI you'll use all day; Test connection is green.
3. Settings › Greg › Attention sense: on if you want the rabbit-hole nudges tested, off if not (either is a valid day; note which).
4. Quit the dev stack if it is running (Ctrl-C in the terminal running `npm run tauri dev`; no `pkill -f`, it reaches sibling sessions); only Heel.app may own the data dir.
5. `cp -a ~/Library/Application\ Support/studio.theft.heel ~/Desktop/heel-before-S9` (the before copy).

## The day (do your real work; these are the only extra asks)
| v0 criterion | What to do at least once | Note afterwards |
|---|---|---|
| Held my tasks | Add 5+ tasks over the day (⌘↩ and through Heel), complete 3, remove 1, quit and reopen Heel once | Did anything vanish or come back wrong? |
| Inbox digest | + › Email in the morning and after lunch; Add task on one item; Open one; Reply to one (Open in Mail is enough) | Were the one-liners literal? Anything invented? |
| Time-box + check-in | Start one box from the Now clock, let it run out, answer the check-in | Was the check-in in your own words? Did Done tick the task? |
| Never sent, never past the budget | Count every time Greg/Heel spoke uninvited (bubble, notification, nudge) | Count must be ≤ 3; nothing left your Mac without a Send |
| Brain | Switch provider once mid-day and ask one question | Did the switch take without a restart? |

Also notice, without trying: did you open the panel when you wanted something (good) or did it pull you (bad)? Did Greg ever annoy you? Did anything take more than one tap that should take one?

## After the day (10 min)
1. Write the notes into the Trello card **S9 Dogfood one real workday** as one comment: the table rows + the three free questions + anything that broke (exact words, time of day).
2. Tick in `PRD.md` the criteria that held; leave the rest and say why in one line each.
3. Every "broke" becomes its own B-card with the exact steps; every "annoying" becomes a P-card (park or fix); do not fix anything during the day.
4. `diff -rq ~/Desktop/heel-before-S9 ~/Library/Application\ Support/studio.theft.heel` is your proof nothing was deleted behind your back; keep the before copy a week.

## What counts as passing
All six rows held, the uninvited count ≤ 3, nothing sent, and you would open it again tomorrow without being asked. Anything less is a list of cards, not a failure.
