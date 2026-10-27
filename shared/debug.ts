import { z } from "zod";
import { PROVIDER_IDS } from "./providers";
/* Debug (N30): what the helper knows about itself. Facts and counts, never content or secrets. */

export const DebugInfoSchema = z.object({
  version: z.string(),
  os: z.string(),
  node: z.string(),
  /** Null until the OS has handed out the port. */
  port: z.number().int().nullable(),
  uptimeSec: z.number(),
  dataDir: z.string(),
  migration: z.number().int(),
  provider: z.enum(PROVIDER_IDS).nullable(),
  attention: z.boolean(),
  counts: z.object({ tasks: z.number().int(), parked: z.number().int(), documents: z.number().int() }),
  /** The last lines of sidecar.log (the shell writes it); empty when the file is missing. */
  sidecarLog: z.array(z.string()),
});
export type DebugInfoDto = z.output<typeof DebugInfoSchema>;
export const DEBUG_REPORT_MAX_CHARS = 200_000;
export const DebugExportInputSchema = z.object({ text: z.string().min(1).max(DEBUG_REPORT_MAX_CHARS) });
export const DebugExportResultSchema = z.object({ path: z.string(), revealed: z.boolean() });
