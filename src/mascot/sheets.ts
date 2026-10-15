import dotRaw from "./manifests/greg.dot.json";
import smoothRaw from "./manifests/greg.smooth.json";
import { ManifestSchema, isActionRow, isLookRow, validateManifest, type ActionRow, type LookRow, type Manifest } from "./manifest";
import { PUPPY_PACK, puppyManifest } from "./puppy";
import { totalMs } from "./timeline";

export type SheetId = "dot" | "smooth" | "puppy";

export type Sheet = {
  id: SheetId;
  /** Where the browser loads the image from (public/). */
  url: string;
  manifest: Manifest;
  actions: ReadonlyMap<string, ActionRow>;
  /** Rows of fixed poses (the look directions), by name. */
  looks: ReadonlyMap<string, LookRow>;
};

function fromManifest(id: SheetId, url: string, manifest: Manifest): Sheet {
  const actions = new Map(manifest.rows.filter(isActionRow).map((row) => [row.name, row] as const));
  const looks = new Map(manifest.rows.filter(isLookRow).map((row) => [row.name, row] as const));
  return { id, url, manifest, actions, looks };
}

function buildSheet(id: SheetId, url: string, raw: unknown): Sheet {
  const manifest = ManifestSchema.parse(raw);
  const problems = validateManifest(manifest);
  if (problems.length > 0) throw new Error(`Mascot sheet "${id}" is not playable: ${problems.join("; ")}.`);
  return fromManifest(id, url, manifest);
}

/** Greg's Dot-compatible sheet: nine actions and 16 look poses, 8 x 11 cells. The fallback that always works. */
export const DOT_SHEET = buildSheet("dot", "/mascot/greg.png", dotRaw);
/** Greg's dense calm sheet: idle, listening, focus, nudge, done, rest; 16 frames each, 16 x 6 cells. */
export const SMOOTH_SHEET = buildSheet("smooth", "/mascot/greg.smooth.png", smoothRaw);

export const SHEETS: Readonly<Record<"dot" | "smooth", Sheet>> = { dot: DOT_SHEET, smooth: SMOOTH_SHEET };

/** The puppy pack (A8): one sheet per clip, 2x WebP grids shown at logical size; `puppy:<clip>` names one, `puppy:look-directions#n` a gaze. */
export const PUPPY_SHEETS: ReadonlyMap<string, Sheet> = new Map(
  Object.entries(PUPPY_PACK.clips).map(([name, clip]) => {
    const manifest = puppyManifest(name, clip);
    return [name, fromManifest("puppy", manifest.image, manifest)] as const;
  }),
);

/**
 * One playable thing, named `sheet:action` (for example `smooth:rest`). A bare name means the Dot sheet.
 * A look pose is `sheet:look-row#frame` (for example `dot:look-row-9#4`): one frame, held.
 */
export type MotionId = `${SheetId}:${string}`;

export type Motion = {
  id: MotionId;
  sheet: Sheet;
  row: number;
  durationsMs: readonly number[];
  loop: boolean;
  /** Set for a held look pose: the frame to show, with no clock. */
  pose: number | null;
};

export function parseMotionId(value: unknown): Motion | null {
  if (typeof value !== "string") return null;
  const [path = "", frameText] = value.split("#");
  const [first, second] = path.includes(":") ? (path.split(":") as [string, string]) : (["dot", path] as const);
  const sheet = first === "dot" || first === "smooth" ? SHEETS[first] : first === "puppy" ? PUPPY_SHEETS.get(second) : undefined;
  if (!sheet) return null;
  const action = sheet.actions.get(second);
  if (action && frameText === undefined) {
    return { id: `${sheet.id}:${action.name}`, sheet, row: action.row, durationsMs: action.durationsMs, loop: action.loop ?? true, pose: null };
  }
  const look = sheet.looks.get(second);
  const frame = frameText === undefined ? 0 : Number(frameText);
  if (!look || !Number.isInteger(frame) || frame < 0 || frame >= look.frames) return null;
  return { id: `${sheet.id}:${look.name}#${frame}` as MotionId, sheet, row: look.row, durationsMs: [1], loop: false, pose: frame };
}

export const isMotionId = (value: unknown): value is MotionId => parseMotionId(value) !== null;

/** How long one pass of the animation takes (a held pose has no length of its own). */
export function motionDuration(id: MotionId): number {
  const motion = parseMotionId(id);
  return motion && motion.pose === null ? totalMs(motion.durationsMs) : 0;
}

/** Heel's product states -> animations (the puppy pack, A8). Only these names are used by app code. */
export const HEEL_STATES = {
  idle: "puppy:idle",
  listening: "puppy:listening",
  /** Heel is working: he sniffs around in place (the walk legs come from N13's pacing). */
  thinking: "puppy:sniff-search",
  /** Working with the panel docked to him: he looks the task over instead of sniffing about. */
  reviewing: "puppy:review",
  greeting: "puppy:wave",
  /** A contented tail wag, not a jump: calm by default. */
  done: "puppy:done",
  /** A failed turn: paw over the face. */
  error: "puppy:error-facepalm",
  focus: "puppy:focus",
  nudge: "puppy:nudge",
  /** A break began: a stretch, then back to sitting. */
  stretch: "puppy:stretch",
} as const satisfies Record<string, MotionId>;

export type HeelState = keyof typeof HEEL_STATES;
