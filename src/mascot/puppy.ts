import { z } from "zod";
import puppyRaw from "./manifests/puppy.json";
import { ManifestSchema, validateManifest, type Manifest } from "./manifest";

/** What scripts/build-puppy-strips.py writes: one 2x WebP grid per clip, frames wrapping after `columns`. */
const ClipSchema = z.object({
  frames: z.number().int().positive(),
  columns: z.number().int().positive(),
  durationsMs: z.array(z.number().positive()),
  loop: z.boolean(),
  rootX: z.array(z.number()).nullable(),
  label: z.string(),
});
const PuppyPackSchema = z.object({ source: z.string(), cellWidth: z.number().int().positive(), cellHeight: z.number().int().positive(), scale: z.number().positive(), clips: z.record(z.string(), ClipSchema) });

export type PuppyClip = z.output<typeof ClipSchema>;

/** The sixteen seated gaze targets, clockwise from straight up (the pack does not calibrate them; this is the Dot convention). */
export const LOOK_CLIP = "look-directions";
const LOOK_STEP_DEGREES = 22.5;

export const PUPPY_PACK = PuppyPackSchema.parse(puppyRaw);

/** A clip as a one-row (wrapping) manifest at logical size; the image is 2x, so the browser scales it down crisply. */
export function puppyManifest(name: string, clip: PuppyClip): Manifest {
  const rows = Math.ceil(clip.frames / clip.columns);
  const row =
    name === LOOK_CLIP
      ? { name, row: 0, frames: clip.frames, anglesDegrees: Array.from({ length: clip.frames }, (_, i) => i * LOOK_STEP_DEGREES) }
      : { name, row: 0, frames: clip.frames, durationsMs: clip.durationsMs, loop: clip.loop };
  const manifest = ManifestSchema.parse({
    image: `/mascot/puppy/${name}.webp`,
    width: PUPPY_PACK.cellWidth * clip.columns,
    height: PUPPY_PACK.cellHeight * rows,
    columns: clip.columns,
    cellWidth: PUPPY_PACK.cellWidth,
    cellHeight: PUPPY_PACK.cellHeight,
    wrap: true,
    rows: [row],
  });
  const problems = validateManifest(manifest);
  if (problems.length > 0) throw new Error(`Puppy clip "${name}" is not playable: ${problems.join("; ")}.`);
  return manifest;
}

/** One pass of a clip, in ms (the look poses have no length of their own). */
export const clipMs = (name: string): number => (PUPPY_PACK.clips[name]?.durationsMs ?? []).reduce((sum, ms) => sum + ms, 0);
