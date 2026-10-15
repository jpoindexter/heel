# Sample on the sensor's own thread; backdate just under the threshold

**Context:** N24b attention sense — a 5 s sampler in the Rust shell, folded by the helper, surfaced as one nudge.

**Insight 1:** Dispatching each sample to the main thread (`run_on_main_thread`) made samples arrive late and rarely while the webview was busy. NSWorkspace's front-app read and the CoreGraphics idle counter are plain reads; take them on the timer thread and emit from there.

**Insight 2:** To test a threshold rule on the real path without waiting the real minutes, backdate helper-side samples to *just under* the threshold, then send ONE real sample through the shell → panel → helper path. Crossing the threshold with the backdated samples spends the hour's budget on the fake path and the real sample then shows nothing.

**Insight 3:** A dev binary has no bundle id; a sensor keyed on bundle id silently drops the app under test. Fall back to the name and say so in the code.

**Apply when:** a native sensor feeds a web layer; a budgeted rule must be shown on screen once.
