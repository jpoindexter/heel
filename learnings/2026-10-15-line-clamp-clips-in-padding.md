# A padded element with `-webkit-line-clamp` shows a sliced extra line

**Context:** The asked bubble (padding + `.clamp-2`) showed two lines and the top half of a third.
**Dead ends:** None; the card named the cause. Measured in the real window to be sure: the sliced line is the overflow painted inside the bottom padding.
**What worked:** Drop the clamp on the bubble (the region scrolls anyway); keep clamps only on text elements without padding (task titles), where the ellipsis renders.
**Why:** `-webkit-line-clamp` decides the content-box height from N lines, but `overflow: hidden` clips at the padding box, so the padding strip shows the next line's top.
**Rule:** Put `-webkit-line-clamp` on an unpadded inner text element, never on the padded box; or don't clamp text the person wrote.
