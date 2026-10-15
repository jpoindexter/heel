export type Box = { x: number; y: number; width: number; height: number };

/** Pixels at or below this alpha (0-255) count as empty: soft shadow and anti-alias fringe stay click-through. */
export const OPAQUE_ALPHA = 40;
const ALPHA_OFFSET = 3;
const CHANNELS = 4;

type Pixels = { data: ArrayLike<number>; width: number; height: number };

/** Smallest box around the opaque pixels of a cell inside an RGBA buffer, or null when the cell is empty. */
export function opaqueBounds(pixels: Pixels, cell: Box): Box | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = cell.y; y < cell.y + cell.height; y += 1) {
    for (let x = cell.x; x < cell.x + cell.width; x += 1) {
      if ((pixels.data[(y * pixels.width + x) * CHANNELS + ALPHA_OFFSET] ?? 0) <= OPAQUE_ALPHA) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return null;
  return { x: minX - cell.x, y: minY - cell.y, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function sameBox(a: Box | null, b: Box | null): boolean {
  if (a === b) return true;
  return a !== null && b !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
