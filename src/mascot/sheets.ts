import dotRaw from "./manifests/greg.dot.json";
import smoothRaw from "./manifests/greg.smooth.json";
import { ManifestSchema, isActionRow, isLookRow, validateManifest, type ActionRow, type LookRow, type Manifest } from "./manifest";
import { totalMs } from "./timeline";

export type SheetId = "dot" | "smooth";

export type Sheet = {
  id: SheetId;
  /** Where the browser loads the image from (public/). */
  url: string;
  manifest: Manifest;
  actions: ReadonlyMap<string, ActionRow>;
  /** Rows of fixed poses (the look directions), by name. */
  looks: ReadonlyMap<string, LookRow>;
};

function buildSheet(id: SheetId, url: string, raw: unknown): Sheet {
  const manifest = ManifestSchema.parse(raw);
  const problems = validateManifest(manifest);
  if (problems.length > 0) throw new Error(`Mascot sheet "${id}" is not playable: ${problems.join("; ")}.`);
  const actions = new Map(manifest.rows.filter(isActionRow).map((row) => [row.name, row] as const));
  const looks = new Map(manifest.rows.filter(isLookRow).map((row) => [row.name, row] as const));
  return { id, url, manifest, actions, looks };
}

/** Greg's Dot-compatible sheet: nine actions and 16 look poses, 8 x 11 cells. The fallback that always works. */
export const DOT_SHEET = buildSheet("dot", "/mascot/greg.png", dotRaw);
/** Greg's dense calm sheet: idle, listening, focus, nudge, done, rest; 16 frames each, 16 x 6 cells. */
export const SMOOTH_SHEET = buildSheet("smooth", "/mascot/greg.smooth.png", smoothRaw);

export const SHEETS: Readonly<Record<SheetId, Sheet>> = { dot: DOT_SHEET, smooth: SMOOTH_SHEET };

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
  const sheet = first === "dot" || first === "smooth" ? SHEETS[first] : undefined;
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

/** Heel's product states -> animations. Only these names are used by app code. */
export const HEEL_STATES = {
  idle: "smooth:idle",
  listening: "dot:waiting",
  thinking: "dot:running",
  greeting: "dot:waving",
  done: "dot:jumping",
  error: "dot:failed",
  focus: "smooth:focus",
  nudge: "smooth:nudge",
} as const satisfies Record<string, MotionId>;

export type HeelState = keyof typeof HEEL_STATES;
