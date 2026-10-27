import { z } from "zod";

/* Privacy & data (N4): what Heel keeps, a backup of it, and the wipe. The panel never sees content here, only counts and file names. */

export const DataPreviewSchema = z.object({
  dataDir: z.string(),
  /** How long a conversation is kept before the helper drops it. */
  retentionDays: z.number().int(),
  counts: z.object({ tasks: z.number().int(), parked: z.number().int(), messages: z.number().int(), documents: z.number().int(), skills: z.number().int() }),
  /** Every entry in the data folder that a wipe removes, with its size (a folder's is the sum of what is in it). */
  files: z.array(z.object({ name: z.string(), bytes: z.number().int() })),
});
export type DataPreviewDto = z.output<typeof DataPreviewSchema>;

export const BackupResultSchema = z.object({ path: z.string(), revealed: z.boolean() });

/** Typed exactly, by hand: a checkbox is clicked through, a phrase is not. */
export const WIPE_PHRASE = "wipe everything";
export const WipeInputSchema = z.object({ confirm: z.literal(WIPE_PHRASE) });
/** `failed` names the folder entries a wipe could not remove (the rows are gone either way). */
export const WipeResultSchema = z.object({ rows: z.number().int(), files: z.number().int(), failed: z.array(z.object({ name: z.string(), reason: z.string() })).default([]) });
export type WipeResultDto = z.infer<typeof WipeResultSchema>;
