# Chat thread showed "Jump to latest" right after the person sent a message

**Context:** Thread follows new messages only while the person is at the bottom (`isNearBottom` on scroll events).
**Dead ends:** Smooth `scrollTo` to the bottom on send. Signal: the pill appeared mid-animation, because scroll events fired on the way down while the position was still far from the bottom, so `following` flipped to false.
**What worked:** Scroll instantly (`behavior: "auto"`) for the "I just sent a message" jump; keep smooth only for revealing an answer.
**Why:** Scroll events cannot tell a programmatic scroll from the person scrolling up; any animated scroll passes through "not near bottom".
**Rule:** When auto-follow logic reads scroll position, scroll instantly for programmatic jumps that must leave the view in follow mode.
