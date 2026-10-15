import { useEffect, useState } from "react";
import { frameAt } from "./timeline";
import { useReducedMotion } from "./useReducedMotion";

/**
 * The frame to show, driven by one requestAnimationFrame loop on a monotonic clock. It restarts whenever the animation
 * changes, stops while the window is hidden (no work for an invisible dog), and shows only the first frame when the
 * person asked for reduced motion.
 */
export function useSpriteClock(durationsMs: readonly number[], loop: boolean, key: string, held = false): number {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (reduced || held) return;
    let started = performance.now();
    let raf = 0;
    let current = 0;
    const tick = (now: number) => {
      const { index, finished } = frameAt(durationsMs, now - started, loop);
      if (index !== current) {
        current = index;
        setFrame(index);
      }
      if (!finished) raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (document.hidden) return;
      started = performance.now() - frameStartOf(durationsMs, current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
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
