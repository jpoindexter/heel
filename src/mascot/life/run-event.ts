import { z } from "zod";
import type { MotionId } from "../sheets";
import { MOTIONS } from "./config";

const RunSchema = z.object({ direction: z.enum(["left", "right"]), duration_ms: z.number().nonnegative(), arriving: z.boolean().default(false) });

/** The run pose for a `heel:run` payload, how long to hold it, and whether he is arriving (so he can greet), or null when the payload is not one. */
export function runFromPayload(payload: unknown): { motion: MotionId; ms: number; arriving: boolean } | null {
  const parsed = RunSchema.safeParse(payload);
  if (!parsed.success) return null;
  return { motion: parsed.data.direction === "left" ? MOTIONS.runLeft : MOTIONS.runRight, ms: parsed.data.duration_ms, arriving: parsed.data.arriving };
}
