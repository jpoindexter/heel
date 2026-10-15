import { useEffect, useState } from "react";
import { frameAt } from "./timeline";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_MOTION).matches);
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * The frame to show, driven by one requestAnimationFrame loop on a monotonic clock. It restarts whenever the animation
 * changes, stops while the window is hidden (no work for an invisible dog), and shows only the first frame when the
 * person asked for reduced motion.
 */
export function useSpriteClock(durationsMs: readonly number[], loop: boolean, key: string): number {
  const reduced = usePrefersReducedMotion();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (reduced) return;
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
  }, [key, loop, reduced]);

  return frame;
}

/** When (ms after the start) a frame begins. Used to resume from the same frame after the window was hidden. */
function frameStartOf(durationsMs: readonly number[], index: number): number {
  return durationsMs.slice(0, index).reduce((sum, ms) => sum + ms, 0);
}
