import { useCallback, useEffect, useRef, type WheelEvent } from "react";
import { swipeFrom } from "./layers-model";
import { useLayers } from "./layers";

/** A gesture is over when the deltas stop for this long; the sum starts again from zero. */
const SWIPE_RESET_MS = 300;

/** Two-finger swipe on the trackpad: right = Back, left = Forward. One move per gesture; vertical scrolling is left alone. */
export function useSwipe(): (event: WheelEvent<HTMLElement>) => void {
  const { back, forward } = useLayers();
  const sum = useRef(0);
  const fired = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return useCallback(
    (event: WheelEvent<HTMLElement>) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      sum.current += event.deltaX;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        sum.current = 0;
        fired.current = false;
      }, SWIPE_RESET_MS);
      if (fired.current) return;
      const move = swipeFrom(sum.current);
      if (!move) return;
      fired.current = true;
      if (move === "back") back();
      else forward();
    },
    [back, forward],
  );
}
