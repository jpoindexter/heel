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

/**
 * How long the frame showing at `elapsedMs` still shows, so a clock can sleep until then instead of ticking every
 * screen refresh. Null when nothing will change: a finished one-shot, or a clip with a single frame.
 */
export function msUntilNextFrame(durationsMs: readonly number[], elapsedMs: number, loop: boolean): number | null {
  const total = totalMs(durationsMs);
  if (total <= 0 || durationsMs.length < 2 || (!loop && elapsedMs >= total)) return null;
  const into = loop ? elapsedMs % total : Math.max(0, elapsedMs);
  let end = 0;
  for (const ms of durationsMs) {
    end += ms;
    if (into < end) return end - into;
  }
  return null;
}

/** Top-left of a frame inside the sheet, in px. A wrapping sheet continues a row's frames on the rows below. */
export function cellOrigin(manifest: Pick<Manifest, "cellWidth" | "cellHeight" | "columns" | "wrap">, row: number, frame: number): { x: number; y: number } {
  const column = manifest.wrap ? frame % manifest.columns : frame;
  const down = manifest.wrap ? Math.floor(frame / manifest.columns) : 0;
  return { x: manifest.cellWidth * column, y: manifest.cellHeight * (row + down) };
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
