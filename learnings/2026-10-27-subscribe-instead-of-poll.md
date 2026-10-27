# Subscribe to every input of a decision instead of polling the decision

**Context:** Click-through for Greg's transparent window was recomputed every 30 ms (33 main-thread round trips a second, around the clock) — audit #8's 2–3 % idle CPU.
**Dead ends:** A slower poll keeps the cost and loses exactness; a "poll only near Greg" poll still polls.
**What worked:** List the inputs of `should_ignore` (pointer, Greg's window position, the dog's box, pressed) and recompute on each one's change: AppKit global + local mouse-moved/dragged monitors (no permission needed for mouse events; `objc2-app-kit` features `NSEvent` + `block2`), the mascot's `Moved` event, and the two commands that set the box and the press. Keep the old loop only as a fallback if a monitor cannot be installed. Measure with `top -l 6 -s 10 -pid …` (five 10 s windows, first sample discarded) on two bundles built from the same tree with and without the change.
**Why:** The answer only changes when an input changes; the OS already delivers every one of those changes as an event.
**Rule:** Before writing `loop { sleep(x); check() }`, name the inputs of `check()` and ask what already notifies on each; poll only what nothing notifies on, and then as slowly as exactness allows.
