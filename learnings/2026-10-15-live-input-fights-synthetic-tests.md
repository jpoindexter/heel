# When the person's live input shares the channel, synthetic samples lose

**Context:** N25 — verifying gaze and come-over with synthetic pointer events while Jason's real mouse was moving.

**Insight:** A shell sense that samples real input every 30 ms overrides a synthetic sample within a frame. "The look never changes" and "the look is stuck" were both the real pointer, not the code. Before reading a reaction as broken: count the samples the hook sees (a counter, not a log), and only send synthetic ones in a window where the real channel is quiet (poll the counter for two seconds of silence). Where the live input happens to be near the target, it is better evidence than any synthetic sample: record it as such.

**Also:** timers in a freshly unhidden WebKit window run late for a while; a sequence that depends on them (run → greet) looks wrong right after `show()`. Replay it with a synthetic trigger before suspecting the logic.

**Apply when:** a test drives a channel the person is also driving.
