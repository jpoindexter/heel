import dotRaw from "../../public/mascot/greg.dot.json";
import smoothRaw from "../../public/mascot/greg.smooth.json";
import { ManifestSchema, isActionRow, validateManifest, type ActionRow, type Manifest } from "./manifest";
import { totalMs } from "./timeline";

export type SheetId = "dot" | "smooth";

export type Sheet = {
  id: SheetId;
  /** Where the browser loads the image from (public/). */
  url: string;
  manifest: Manifest;
  actions: ReadonlyMap<string, ActionRow>;
};

function buildSheet(id: SheetId, url: string, raw: unknown): Sheet {
  const manifest = ManifestSchema.parse(raw);
  const problems = validateManifest(manifest);
  if (problems.length > 0) throw new Error(`Mascot sheet "${id}" is not playable: ${problems.join("; ")}.`);
  const actions = new Map(manifest.rows.filter(isActionRow).map((row) => [row.name, row] as const));
  return { id, url, manifest, actions };
}

/** Greg's Dot-compatible sheet: nine actions and 16 look poses, 8 x 11 cells. The fallback that always works. */
export const DOT_SHEET = buildSheet("dot", "/mascot/greg.png", dotRaw);
/** Greg's dense calm sheet: idle, listening, focus, nudge, done, rest; 16 frames each, 16 x 6 cells. */
export const SMOOTH_SHEET = buildSheet("smooth", "/mascot/greg.smooth.png", smoothRaw);

export const SHEETS: Readonly<Record<SheetId, Sheet>> = { dot: DOT_SHEET, smooth: SMOOTH_SHEET };

/** One playable animation, named `sheet:action` (for example `smooth:rest`). A bare name means the Dot sheet. */
export type MotionId = `${SheetId}:${string}`;

export type Motion = { id: MotionId; sheet: Sheet; action: ActionRow };

export function parseMotionId(value: unknown): Motion | null {
  if (typeof value !== "string") return null;
  const [first, second] = value.includes(":") ? (value.split(":") as [string, string]) : (["dot", value] as const);
  const sheet = first === "dot" || first === "smooth" ? SHEETS[first] : undefined;
  const action = sheet?.actions.get(second);
  return sheet && action ? { id: `${sheet.id}:${action.name}`, sheet, action } : null;
}

export const isMotionId = (value: unknown): value is MotionId => parseMotionId(value) !== null;

/** How long one pass of the animation takes. */
export function motionDuration(id: MotionId): number {
  const motion = parseMotionId(id);
  return motion ? totalMs(motion.action.durationsMs) : 0;
}

/** Heel's product states -> animations. Only these names are used by app code. */
export const HEEL_STATES = {
  idle: "dot:idle",
  listening: "dot:waiting",
  thinking: "dot:running",
  greeting: "dot:waving",
  done: "dot:jumping",
  error: "dot:failed",
} as const satisfies Record<string, MotionId>;

export type HeelState = keyof typeof HEEL_STATES;
