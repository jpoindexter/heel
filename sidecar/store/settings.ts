import { z } from "zod";
import { DEFAULT_METHOD, DEFAULT_METHOD_NUMBERS, MethodNumbersSchema, MethodSchema, notBuiltReason, type Method, type MethodNumbers } from "../../shared/method";
import { PROVIDER_IDS, type ProviderId } from "../../shared/providers";
import type { Ctx } from "./context";
import { fail, ok, type Result } from "./result";
import { firstIssue } from "./schema";

export { PROVIDER_IDS, type ProviderId };

const BRAIN_KEY = "brain";
const METHOD_KEY = "method";
const NUMBERS_KEY = "method-numbers";
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

/** The chosen ways of working; a missing or corrupt row is the default (time-box, no structure, no sizing). */
export function getMethod(ctx: Ctx): Method {
  const row = ctx.db.prepare("SELECT value FROM settings WHERE key = ?").get(METHOD_KEY);
  if (!row) return DEFAULT_METHOD;
  try {
    const parsed = MethodSchema.safeParse(JSON.parse(String(row.value)));
    return parsed.success && !notBuiltReason(parsed.data) ? parsed.data : DEFAULT_METHOD;
  } catch {
    return DEFAULT_METHOD;
  }
}

export function setMethod(ctx: Ctx, input: unknown): Result<Method> {
  const parsed = MethodSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  const reason = notBuiltReason(parsed.data);
  if (reason) return fail("conflict", reason);
  ctx.db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(METHOD_KEY, JSON.stringify(parsed.data), ctx.now());
  return ok(parsed.data);
}

export function getMethodNumbers(ctx: Ctx): MethodNumbers {
  const row = ctx.db.prepare("SELECT value FROM settings WHERE key = ?").get(NUMBERS_KEY);
  if (!row) return DEFAULT_METHOD_NUMBERS;
  try {
    return MethodNumbersSchema.safeParse(JSON.parse(String(row.value))).data ?? DEFAULT_METHOD_NUMBERS;
  } catch {
    return DEFAULT_METHOD_NUMBERS;
  }
}

export function setMethodNumbers(ctx: Ctx, input: unknown): Result<MethodNumbers> {
  const parsed = MethodNumbersSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  ctx.db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(NUMBERS_KEY, JSON.stringify(parsed.data), ctx.now());
  return ok(parsed.data);
}

const SKILLS_OFF_KEY = "skills-off";
const MAX_SKILLS_OFF = 200;

/** Skill ids the person switched off. A missing or corrupt row means none. */
export function getSkillsOff(ctx: Ctx): string[] {
  const row = ctx.db.prepare("SELECT value FROM settings WHERE key = ?").get(SKILLS_OFF_KEY);
  if (!row) return [];
  try {
    return z.array(z.string()).max(MAX_SKILLS_OFF).safeParse(JSON.parse(String(row.value))).data ?? [];
  } catch {
    return [];
  }
}

export function setSkillsOff(ctx: Ctx, ids: readonly string[]): Result<string[]> {
  const parsed = z.array(z.string().min(1).max(100)).max(MAX_SKILLS_OFF).safeParse([...new Set(ids)]);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  ctx.db
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .run(SKILLS_OFF_KEY, JSON.stringify(parsed.data), ctx.now());
  return ok(parsed.data);
}
