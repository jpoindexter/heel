# A cleanup that reuses the close callback closes twice

**Context.** Heel's reply layer fades out, then runs one `onDismiss` that cleared the conversation and popped the layer. Esc mid-fade already pops the layer; the component's unmount cleanup then ran the same `onDismiss`, popping a second layer (Settings under it closed too).

**Insight.** When a callback does two jobs (clear state + close the surface) and one of the paths that fires it is "the surface was already closed by something else", split it: the data job runs on every path, the close job only on the path that owns the surface.

**Pattern.** `onDismiss` (state) + `onClosed` (surface); the timer path calls both, the unmount path calls only the first. Same shape fits any fade-then-close control that can also be closed from outside.
