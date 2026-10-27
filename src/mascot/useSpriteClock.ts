import { useEffect, useState } from "react";
import { frameAt, msUntilNextFrame } from "./timeline";
import { useReducedMotion } from "./useReducedMotion";

/**
 * The frame to show, from a monotonic clock. The clock sleeps until the next frame change (N9: a requestAnimationFrame
 * loop kept the window's display link running at every refresh, the largest part of Heel's idle cost) and does nothing
 * at all for a held pose or a finished one-shot. It restarts whenever the animation changes, stops while the window is
 * hidden (no work for an invisible dog), and shows only the first frame when the person asked for reduced motion.
 */
export function useSpriteClock(durationsMs: readonly number[], loop: boolean, key: string, held = false): number {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (reduced || held) return;
    let started = performance.now();
    let timer = 0;
    let current = 0;
    const show = () => {
      const elapsed = performance.now() - started;
      const { index } = frameAt(durationsMs, elapsed, loop);
      if (index !== current) {
        current = index;
        setFrame(index);
      }
      const wait = msUntilNextFrame(durationsMs, elapsed, loop);
      if (wait !== null) timer = window.setTimeout(show, wait);
    };
    const onVisibility = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      started = performance.now() - frameStartOf(durationsMs, current);
      show();
    };
    show();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // `key` identifies the animation; durationsMs is derived from it and is stable per key.
  }, [key, loop, reduced, held]);

  return frame;
}

/** When (ms after the start) a frame begins. Used to resume from the same frame after the window was hidden. */
function frameStartOf(durationsMs: readonly number[], index: number): number {
  return durationsMs.slice(0, index).reduce((sum, ms) => sum + ms, 0);
}
