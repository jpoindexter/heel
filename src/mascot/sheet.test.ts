import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../../public/mascot/greg.dot.json";
import { CELL_H, CELL_W, COLUMNS, LOOK_FRAMES_PER_ROW, MOTIONS, ROWS, SHEET_H, SHEET_W } from "./atlas";

const GREG_PNG = "public/mascot/greg.png";
const RIFF_PNG = "public/mascot/riff.png";

// Pinned so a swapped or re-exported file fails here instead of silently changing the mascot.
const GREG_SHA256 = "4353761c6e78bdaf0a5673aac3c54025a61bd841af4d1fc9dcf673b1b3c5e68a";
const PNG_RGBA_COLOR_TYPE = 6;

function pngHeader(path: string) {
  const bytes = readFileSync(path);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25], bytes };
}

describe("Greg's sprite sheet", () => {
  it("is the exact validated file", () => {
    const { bytes } = pngHeader(GREG_PNG);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(GREG_SHA256);
  });

  it("is an RGBA PNG with the atlas dimensions (8 x 11 cells of 192 x 208)", () => {
    const { width, height, colorType } = pngHeader(GREG_PNG);
    expect([width, height]).toEqual([SHEET_W, SHEET_H]);
    expect(colorType).toBe(PNG_RGBA_COLOR_TYPE);
    expect([COLUMNS, ROWS, CELL_W, CELL_H]).toEqual([8, 11, 192, 208]);
  });

  it("leaves Riff's original sheet in place", () => {
    expect(existsSync(RIFF_PNG)).toBe(true);
  });
});

describe("Greg's manifest matches the atlas", () => {
  it("declares the same geometry", () => {
    expect([manifest.width, manifest.height, manifest.cellWidth, manifest.cellHeight, manifest.columns]).toEqual([
      SHEET_W,
      SHEET_H,
      CELL_W,
      CELL_H,
      COLUMNS,
    ]);
  });

  it("has the same row and every frame duration for all nine action motions", () => {
    const actions = manifest.rows.filter((r): r is typeof r & { durationsMs: number[] } => "durationsMs" in r);
    expect(actions).toHaveLength(9);
    for (const entry of actions) {
      const ours = MOTIONS[entry.name as keyof typeof MOTIONS];
      expect(ours, `atlas.ts has no motion named ${entry.name}`).toBeDefined();
      expect({ row: ours.row, times: [...ours.times] }, entry.name).toEqual({ row: entry.row, times: entry.durationsMs });
    }
  });

  it("describes the 16 look directions as two rows of 8 fixed poses in 22.5 degree steps", () => {
    const looks = manifest.rows.filter((r): r is typeof r & { anglesDegrees: number[] } => "anglesDegrees" in r);
    expect(looks.map((l) => [l.row, l.frames])).toEqual([
      [MOTIONS.look.row, LOOK_FRAMES_PER_ROW],
      [MOTIONS.look.row + 1, LOOK_FRAMES_PER_ROW],
    ]);
    const angles = looks.flatMap((l) => l.anglesDegrees);
    expect(angles).toEqual(Array.from({ length: MOTIONS.look.times.length }, (_, i) => i * 22.5));
  });
});
