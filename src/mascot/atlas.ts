// Dot-format sprite atlas: 8 columns x 11 rows of 192x208 cells.
// Riff's sheet and Greg's future export share this geometry, so swapping art = swapping the PNG.
export const CELL_W = 192;
export const CELL_H = 208;
export const COLUMNS = 8;
export const ROWS = 11;
export const SHEET_W = CELL_W * COLUMNS;
export const SHEET_H = CELL_H * ROWS;
export const LOOK_FRAMES_PER_ROW = 8;

type Motion = { row: number; times: readonly number[] };

// Per-frame durations in ms, taken from the Dot preview.
export const MOTIONS = {
  idle: { row: 0, times: [280, 110, 110, 140, 140, 320] },
  "running-right": { row: 1, times: [120, 120, 120, 120, 120, 120, 120, 220] },
  "running-left": { row: 2, times: [120, 120, 120, 120, 120, 120, 120, 220] },
  waving: { row: 3, times: [140, 140, 140, 280] },
  jumping: { row: 4, times: [140, 140, 140, 140, 280] },
  failed: { row: 5, times: [140, 140, 140, 140, 140, 140, 140, 240] },
  waiting: { row: 6, times: [150, 150, 150, 150, 150, 260] },
  running: { row: 7, times: [120, 120, 120, 120, 120, 220] },
  review: { row: 8, times: [150, 150, 150, 150, 150, 280] },
  look: { row: 9, times: Array<number>(16).fill(240) },
} as const satisfies Record<string, Motion>;

export type MotionName = keyof typeof MOTIONS;

export function isMotionName(value: unknown): value is MotionName {
  return typeof value === "string" && value in MOTIONS;
}

/** Background offset (px, already negated) for a frame of a motion. */
export function framePosition(motion: MotionName, frame: number): { x: number; y: number } {
  const { row } = MOTIONS[motion];
  const rowOffset = motion === "look" ? Math.floor(frame / LOOK_FRAMES_PER_ROW) : 0;
  // 0 - n (not -n) so the first cell yields +0, never -0.
  return { x: 0 - CELL_W * (frame % COLUMNS), y: 0 - CELL_H * (row + rowOffset) };
}

export function motionDuration(motion: MotionName): number {
  return MOTIONS[motion].times.reduce((sum, ms) => sum + ms, 0);
}

// Heel's product states -> atlas motions. Only these names are used by app code.
export const HEEL_STATES = {
  idle: "idle",
  listening: "waiting",
  thinking: "running",
  greeting: "waving",
  done: "jumping",
  error: "failed",
} as const satisfies Record<string, MotionName>;

export type HeelState = keyof typeof HEEL_STATES;
