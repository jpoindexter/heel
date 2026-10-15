import { z } from "zod";
import type { Ctx } from "./context";
import { fail, ok, type Result } from "./result";
import { firstIssue } from "./schema";

export const PROVIDER_IDS = ["claude", "codex", "ollama"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

const BRAIN_KEY = "brain";
const MAX_MODEL_LENGTH = 200;

export const BrainSettingsInput = z.object({
  provider: z.enum(PROVIDER_IDS, { error: `Provider must be one of: ${PROVIDER_IDS.join(", ")}.` }).nullable(),
  model: z.string().trim().min(1, "Model can't be empty. Leave it unset to use the provider's default.").max(MAX_MODEL_LENGTH).nullable(),
});

export type BrainSettings = z.output<typeof BrainSettingsInput>;

export const DEFAULT_BRAIN: BrainSettings = { provider: null, model: null };

/** Stored values are re-validated on read; a corrupt row falls back to defaults instead of crashing. */
export function getBrain(ctx: Ctx): BrainSettings {
  const row = ctx.db.prepare("SELECT value FROM settings WHERE key = ?").get(BRAIN_KEY);
  if (!row) return DEFAULT_BRAIN;
  try {
    const parsed = BrainSettingsInput.safeParse(JSON.parse(String(row.value)));
    return parsed.success ? parsed.data : DEFAULT_BRAIN;
  } catch {
    return DEFAULT_BRAIN;
  }
}

export function setBrain(ctx: Ctx, input: unknown): Result<BrainSettings> {
  const parsed = BrainSettingsInput.safeParse(input);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  ctx.db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(BRAIN_KEY, JSON.stringify(parsed.data), ctx.now());
  return ok(parsed.data);
}
