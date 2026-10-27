import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isLookRow } from "./manifest";
import { DOT_SHEET, HEEL_STATES, PUPPY_SHEETS, SHEETS, SMOOTH_SHEET, isMotionId, motionDuration, parseMotionId } from "./sheets";
import { LOOK_CLIP, PUPPY_PACK } from "./puppy";

const PNG_RGBA_COLOR_TYPE = 6;

// Pinned so a swapped or re-exported file fails here instead of silently changing the mascot.
const PINNED = {
  dot: { path: "public/mascot/greg.png", sha256: "4353761c6e78bdaf0a5673aac3c54025a61bd841af4d1fc9dcf673b1b3c5e68a" },
  smooth: { path: "public/mascot/greg.smooth.png", sha256: "d1f45393387099cf8572af5bcd4267118ea0be77c905874d5346ba7120cfd38e" },
} as const;

function pngHeader(path: string) {
  const bytes = readFileSync(path);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25], bytes };
}

describe.each(Object.entries(PINNED))("%s sheet image", (id, { path, sha256 }) => {
  const sheet = SHEETS[id as keyof typeof SHEETS];

  it("is the exact validated file", () => {
    expect(createHash("sha256").update(pngHeader(path).bytes).digest("hex")).toBe(sha256);
  });

  it("is an RGBA PNG exactly as big as its manifest says", () => {
    const { width, height, colorType } = pngHeader(path);
    expect([width, height]).toEqual([sheet.manifest.width, sheet.manifest.height]);
    expect(colorType).toBe(PNG_RGBA_COLOR_TYPE);
  });
});

describe("Greg's two sheets", () => {
  it("have the geometry the art was drawn for (192 x 208 cells; 8 x 11 and 16 x 6)", () => {
    expect([DOT_SHEET.manifest.columns, DOT_SHEET.manifest.height / DOT_SHEET.manifest.cellHeight, DOT_SHEET.manifest.cellWidth, DOT_SHEET.manifest.cellHeight]).toEqual([8, 11, 192, 208]);
    expect([SMOOTH_SHEET.manifest.columns, SMOOTH_SHEET.manifest.height / SMOOTH_SHEET.manifest.cellHeight]).toEqual([16, 6]);
  });

  it("keep the nine Dot actions with their exact timings", () => {
    expect([...DOT_SHEET.actions.keys()]).toEqual(["idle", "running-right", "running-left", "waving", "jumping", "failed", "waiting", "running", "review"]);
    expect(DOT_SHEET.actions.get("idle")!.durationsMs).toEqual([280, 110, 110, 140, 140, 320]);
    expect(motionDuration("dot:waving")).toBe(700);
  });

  it("have the six dense calm states, 16 frames each", () => {
    expect([...SMOOTH_SHEET.actions.keys()]).toEqual(["idle", "listening", "focus", "nudge", "done", "rest"]);
    for (const action of SMOOTH_SHEET.actions.values()) expect(action.frames).toBe(16);
  });

  it("describe the 16 Dot look directions as two rows of 8 fixed poses in 22.5 degree steps", () => {
    const looks = DOT_SHEET.manifest.rows.filter(isLookRow);
    expect(looks.map((l) => [l.row, l.frames])).toEqual([[9, 8], [10, 8]]);
    expect(looks.flatMap((l) => l.anglesDegrees).sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i * 22.5));
  });

  it("leave Riff's original sheet in place", () => {
    expect(existsSync("public/mascot/riff.png")).toBe(true);
  });
});

describe("motion ids", () => {
  it("name an action on a sheet; a bare name means the Dot sheet", () => {
    expect(parseMotionId("smooth:rest")?.sheet.id).toBe("smooth");
    expect(parseMotionId("idle")?.id).toBe("dot:idle");
    expect(parseMotionId("dot:running-left")?.row).toBe(2);
  });

  it("reject unknown sheets, unknown actions and non-strings", () => {
    for (const bad of ["dance", "dot:dance", "other:idle", "smooth:running", 42, null, undefined]) expect(isMotionId(bad)).toBe(false);
  });

  it("resolve every product state to a real animation", () => {
    for (const id of Object.values(HEEL_STATES)) expect(parseMotionId(id), id).not.toBeNull();
  });
});

describe("look poses", () => {
  it("name one frame of a look row and hold it", () => {
    const pose = parseMotionId("dot:look-row-9#4");
    expect(pose).toMatchObject({ id: "dot:look-row-9#4", row: 9, pose: 4, loop: false });
    expect(motionDuration("dot:look-row-9#4")).toBe(0);
  });

  it("reject a pose outside the row, or a non-number", () => {
    for (const bad of ["dot:look-row-9#8", "dot:look-row-9#-1", "dot:look-row-9#x", "dot:idle#2", "smooth:look-row-9#0"]) expect(isMotionId(bad), bad).toBe(false);
  });

  it("play actions with their own timings and no fixed pose", () => {
    expect(parseMotionId("smooth:rest")).toMatchObject({ pose: null, loop: true, row: 5 });
  });
});

describe("the puppy pack (A8)", () => {
  /** A projection of assets/heel/puppy-v1/final/manifest.json (frame counts, timings, loop flags only): the art folder is not in the repo, and a skipIf on it meant a clean clone never ran this check. */
  const SOURCE = "src/mascot/__fixtures__/puppy-v1-manifest.json";

  it("carries every clip of the source pack with the same frame counts, timings and loop flags", () => {
    const source = JSON.parse(readFileSync(SOURCE, "utf8")) as { animations: Record<string, { frameCount: number; loop: boolean; frames: { durationMs: number }[] }> };
    expect(Object.keys(PUPPY_PACK.clips).sort()).toEqual(Object.keys(source.animations).sort());
    for (const [name, clip] of Object.entries(source.animations)) {
      const ours = PUPPY_PACK.clips[name]!;
      expect(ours.frames, name).toBe(clip.frameCount);
      expect(ours.loop, name).toBe(clip.loop);
      expect(ours.durationsMs, name).toEqual(clip.frames.map((f) => f.durationMs));
    }
  });

  it("has a 2x WebP grid on disk for every clip, as wide as its columns say", () => {
    for (const [name, clip] of Object.entries(PUPPY_PACK.clips)) {
      const path = `public/mascot/puppy/${name}.webp`;
      expect(existsSync(path), path).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.subarray(0, 4).toString("ascii"), name).toBe("RIFF");
      const sheet = PUPPY_SHEETS.get(name)!;
      expect(sheet.manifest.width).toBe(clip.columns * PUPPY_PACK.cellWidth);
      expect(sheet.manifest.height).toBe(Math.ceil(clip.frames / clip.columns) * PUPPY_PACK.cellHeight);
    }
  });

  it("plays a clip by name, a gaze by frame, and nothing that is not in the pack", () => {
    expect(parseMotionId("puppy:idle")?.loop).toBe(true);
    expect(parseMotionId("puppy:wave")?.loop).toBe(false);
    expect(motionDuration("puppy:wave")).toBe(1882);
    expect(parseMotionId(`puppy:${LOOK_CLIP}#15`)?.pose).toBe(15);
    expect(parseMotionId(`puppy:${LOOK_CLIP}#16`)).toBeNull();
    expect(parseMotionId("puppy:no-such-clip")).toBeNull();
    for (const id of Object.values(HEEL_STATES)) expect(isMotionId(id), id).toBe(true);
  });
});
