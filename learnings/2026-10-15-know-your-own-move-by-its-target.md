# Know your own window move by where you sent it, not by where the other window is now

**Context:** B5 — telling the person's drag of the panel from Heel's own follow of Greg.

**Insight:** A window's Moved event can arrive after the thing it was following has moved again (a slide-in, a walk, a fast drag). Deciding "was this mine?" by recomputing the expected spot from the *current* state of the other window fails exactly then, and a "self-move" flag set around `set_position` fails whenever delivery is asynchronous. What holds: remember the exact target you last sent the window to; an event landing there is yours, anything else is the person's.

**Also:** when a test window is revealed with focus, the person's own keystrokes land in it. Two "mysterious" closes were the panel's Esc handler. Instrument with `isTrusted` and the key before suspecting your code, and keep reveals to a minimum while the person is at the keyboard.

**Apply when:** two windows follow each other and the person may drag either.
