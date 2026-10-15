import { z } from "zod";
import { INITIAL_ATTENTION, decideAttention, type AttentionContext, type AttentionState, type Nudge, type Sample } from "../../shared/attention";
import { AttentionSettingsSchema, DEFAULT_ATTENTION_SETTINGS, type AttentionSettings } from "../../shared/api";
import type { Ctx } from "./context";
import { dayKey } from "./history";
import { spendInterrupt } from "./interrupts";
import { fail, ok, type Result } from "./result";
import { firstIssue } from "./schema";

const SETTINGS_KEY = "attention-settings";
const STATE_KEY = "attention-state";
const DAY_KEY = "attention-day";

const DaySchema = z.object({ date: z.string(), apps: z.record(z.string(), z.object({ name: z.string(), seconds: z.number() })) });
export type AttentionDay = z.output<typeof DaySchema>;

function readRow<T>(ctx: Ctx, key: string, parse: (raw: unknown) => T | undefined): T | undefined {
  const row = ctx.db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (!row) return undefined;
  try {
    return parse(JSON.parse(String(row.value)));
  } catch {
    return undefined;
  }
}

function writeRow(ctx: Ctx, key: string, value: unknown): void {
  ctx.db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, JSON.stringify(value), ctx.now());
}

export const getAttentionSettings = (ctx: Ctx): AttentionSettings =>
  readRow(ctx, SETTINGS_KEY, (raw) => AttentionSettingsSchema.safeParse(raw).data) ?? DEFAULT_ATTENTION_SETTINGS;

export function setAttentionSettings(ctx: Ctx, input: unknown): Result<AttentionSettings> {
  const parsed = AttentionSettingsSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  writeRow(ctx, SETTINGS_KEY, parsed.data);
  if (!parsed.data.enabled) writeRow(ctx, STATE_KEY, INITIAL_ATTENTION);
  return ok(parsed.data);
}

/** Today's seconds per app; yesterday's are gone at the first sample of a new day. */
export function getAttentionDay(ctx: Ctx): AttentionDay {
  const today = dayKey(ctx.now());
  const day = readRow(ctx, DAY_KEY, (raw) => DaySchema.safeParse(raw).data);
  return day && day.date === today ? day : { date: today, apps: {} };
}

/** Rather than the `attention-state` row growing, nothing is kept but the fold's small state. */
const getState = (ctx: Ctx): AttentionState => readRow(ctx, STATE_KEY, (raw) => (raw as AttentionState | undefined)) ?? INITIAL_ATTENTION;

type SampleIn = Sample & { intervalSec: number };

/** The hour makes the budget reason unique per hour, so a rule may speak again later in the day but never twice an hour. */
const reasonFor = (rule: Nudge["rule"], at: number) => `attention:${rule}:${new Date(at).getHours()}`;

/**
 * Fold one sample in: the day's seconds, the drift state, and (through the interrupt budget) at most one nudge.
 * The sensor being off means no samples arrive; a sample while off is ignored, never folded.
 */
export function foldAttention(ctx: Ctx, sample: SampleIn, context: Omit<AttentionContext, "now">): Nudge | null {
  if (!getAttentionSettings(ctx).enabled) return null;
  const day = getAttentionDay(ctx);
  const entry = day.apps[sample.bundle] ?? { name: sample.name, seconds: 0 };
  writeRow(ctx, DAY_KEY, { ...day, apps: { ...day.apps, [sample.bundle]: { name: sample.name, seconds: entry.seconds + sample.intervalSec } } });
  const before = getState(ctx);
  const result = decideAttention(before, sample, { ...context, now: sample.at });
  if (!result.nudge) {
    writeRow(ctx, STATE_KEY, result.state);
    return null;
  }
  const spent = spendInterrupt(ctx, reasonFor(result.nudge.rule, sample.at));
  const allowed = spent.ok && spent.value.allowed;
  writeRow(ctx, STATE_KEY, allowed ? result.state : { ...result.state, spokeAt: before.spokeAt });
  return allowed ? result.nudge : null;
}
