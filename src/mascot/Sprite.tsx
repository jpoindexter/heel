import { useEffect, useState } from "react";
import { useHitRegion } from "./useHitRegion";
import { CELL_H, CELL_W, MOTIONS, SHEET_H, SHEET_W, framePosition, type MotionName } from "./atlas";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
// Greg's Dot-compatible sheet (same 8x11, 192x208 geometry). Riff's original stays at /mascot/riff.png.
const SHEET_URL = "/mascot/greg.png";

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

export function Sprite({ motion, label }: { motion: MotionName; label: string }) {
  const reduced = usePrefersReducedMotion();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (reduced) return;
    const { times } = MOTIONS[motion];
    let index = 0;
    let timer = window.setTimeout(function step() {
      index = (index + 1) % times.length;
      setFrame(index);
      timer = window.setTimeout(step, times[index]);
    }, times[0]);
    return () => window.clearTimeout(timer);
  }, [motion, reduced]);

  useHitRegion(SHEET_URL, motion, frame);
  const { x, y } = framePosition(motion, frame);
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        width: CELL_W,
        height: CELL_H,
        backgroundImage: `url(${SHEET_URL})`,
        backgroundSize: `${SHEET_W}px ${SHEET_H}px`,
        backgroundPosition: `${x}px ${y}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
