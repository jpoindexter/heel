import { z } from "zod";

const AnchorSchema = z.object({ edge: z.enum(["top", "bottom"]), offset: z.number().finite() });

export type Anchor = z.output<typeof AnchorSchema>;

/** Before the shell has said anything, the panel assumes it sits above Greg, with the tail near the right (where he lives). */
export const DEFAULT_ANCHOR: Anchor = { edge: "bottom", offset: Number.POSITIVE_INFINITY };

/** An anchor from the shell, or null when the message is not one. */
export function anchorFromPayload(payload: unknown): Anchor | null {
  const parsed = AnchorSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}
