import type { Manifest } from "./manifest";

export const totalMs = (durationsMs: readonly number[]): number => durationsMs.reduce((sum, ms) => sum + ms, 0);

/**
 * Which frame is showing `elapsedMs` after the animation started, from a monotonic clock (not chained timers, so a slow
 * frame can't make the animation drift). A looping animation wraps; a one-shot holds its last frame and reports `finished`.
 */
export function frameAt(durationsMs: readonly number[], elapsedMs: number, loop: boolean): { index: number; finished: boolean } {
  const total = totalMs(durationsMs);
  if (!loop && elapsedMs >= total) return { index: durationsMs.length - 1, finished: true };
  let remaining = loop && total > 0 ? elapsedMs % total : Math.max(0, elapsedMs);
  for (let index = 0; index < durationsMs.length; index += 1) {
    remaining -= durationsMs[index]!;
    if (remaining < 0) return { index, finished: false };
  }
  return { index: durationsMs.length - 1, finished: false };
}

/** Top-left of a frame inside the sheet, in px. */
export function cellOrigin(manifest: Pick<Manifest, "cellWidth" | "cellHeight">, row: number, frame: number): { x: number; y: number } {
  return { x: manifest.cellWidth * frame, y: manifest.cellHeight * row };
}

/** The sample closest to `degrees` on a circle (so 359 is next to 0). */
export function nearestAngleIndex(anglesDegrees: readonly number[], degrees: number): number {
  const wrap = (value: number) => ((value % 360) + 360) % 360;
  const distance = (a: number, b: number) => {
    const d = Math.abs(wrap(a) - wrap(b));
    return Math.min(d, 360 - d);
  };
  let best = 0;
  anglesDegrees.forEach((angle, index) => {
    if (distance(angle, degrees) < distance(anglesDegrees[best]!, degrees)) best = index;
  });
  return best;
}
