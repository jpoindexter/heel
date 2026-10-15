import { z } from "zod";

/**
 * A sprite sheet described as data: a grid of equal cells, and per row either an action (frames with durations)
 * or a set of look poses (frames at fixed angles). Both Greg sheets use this shape, so a new sheet is a JSON file.
 */
const ActionRowSchema = z.object({
  name: z.string().min(1),
  row: z.number().int().min(0),
  frames: z.number().int().min(1),
  durationsMs: z.array(z.number().positive()),
  loop: z.boolean().optional(),
});

const LookRowSchema = z.object({
  name: z.string().min(1),
  row: z.number().int().min(0),
  frames: z.number().int().min(1),
  anglesDegrees: z.array(z.number()),
});

export const ManifestSchema = z.object({
  image: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  columns: z.number().int().positive(),
  cellWidth: z.number().int().positive(),
  cellHeight: z.number().int().positive(),
  /** Frames wrap onto the next row after `columns` (one clip per sheet, as the puppy pack is laid out). */
  wrap: z.boolean().optional(),
  rows: z.array(z.union([ActionRowSchema, LookRowSchema])),
});

/** How many sheet rows a row's frames take: one, or more when they wrap. */
export const rowSpan = (manifest: Pick<Manifest, "columns" | "wrap">, frames: number): number => (manifest.wrap ? Math.ceil(frames / manifest.columns) : 1);

export type Manifest = z.output<typeof ManifestSchema>;
export type ActionRow = z.output<typeof ActionRowSchema>;
export type LookRow = z.output<typeof LookRowSchema>;

export const isActionRow = (row: Manifest["rows"][number]): row is ActionRow => "durationsMs" in row;
export const isLookRow = (row: Manifest["rows"][number]): row is LookRow => "anglesDegrees" in row;

/** Everything wrong with a manifest, in plain words. Empty means it can be played. */
export function validateManifest(manifest: Manifest): string[] {
  const problems: string[] = [];
  const names = new Set<string>();
  if (manifest.width !== manifest.columns * manifest.cellWidth) {
    problems.push(`width ${manifest.width} is not columns (${manifest.columns}) x cell width (${manifest.cellWidth})`);
  }
  if (manifest.height % manifest.cellHeight !== 0) problems.push(`height ${manifest.height} is not a whole number of cells`);
  for (const row of manifest.rows) {
    if (names.has(row.name)) problems.push(`"${row.name}" appears twice`);
    names.add(row.name);
    if ((row.row + rowSpan(manifest, row.frames)) * manifest.cellHeight > manifest.height) problems.push(`"${row.name}" is on row ${row.row}, below the sheet`);
    if (!manifest.wrap && row.frames > manifest.columns) problems.push(`"${row.name}" has ${row.frames} frames but the sheet has ${manifest.columns} columns`);
    if (isActionRow(row) && row.durationsMs.length !== row.frames) problems.push(`"${row.name}" has ${row.frames} frames but ${row.durationsMs.length} durations`);
    if (isLookRow(row) && row.anglesDegrees.length !== row.frames) problems.push(`"${row.name}" has ${row.frames} frames but ${row.anglesDegrees.length} angles`);
  }
  return problems;
}
