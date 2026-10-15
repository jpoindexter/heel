import { z } from "zod";

const FadeSchema = z.object({ opacity: z.number().min(0).max(1), ms: z.number().nonnegative() });

export type Fade = z.output<typeof FadeSchema>;

/** A `heel:fade` payload, or null when it is not one. */
export function fadeFromPayload(payload: unknown): Fade | null {
  const parsed = FadeSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}
