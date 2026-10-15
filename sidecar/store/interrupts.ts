import { z } from "zod";
import type { Ctx } from "./context";
import { fail, ok, type Result } from "./result";
import { firstIssue } from "./schema";

/** Silent by default: Greg may speak up this many times a day (DECISIONS: D4). */
export const DAILY_INTERRUPT_LIMIT = 3;
const KEY = "interrupts";

const Spent = z.object({ day: z.string(), reasons: z.array(z.string()) });
const Reason = z.string().trim().min(1, "Say why Greg wants to speak.").max(100);

export type InterruptState = { limit: number; used: number; remaining: number };
export type SpendResult = { allowed: boolean; remaining: number; why: "spent" | "already" | "budget" };

/** The calendar day where the person is, so the budget resets at their midnight. */
const dayOf = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function readToday(ctx: Ctx): z.output<typeof Spent> {
  const today = dayOf(ctx.now());
  const row = ctx.db.prepare("SELECT value FROM settings WHERE key = ?").get(KEY);
  try {
    const parsed = Spent.safeParse(row ? JSON.parse(String(row.value)) : null);
    if (parsed.success && parsed.data.day === today) return parsed.data;
  } catch {
    /* a corrupt row counts as a fresh day: the budget errs toward silence, never toward a crash */
  }
  return { day: today, reasons: [] };
}

export function interruptState(ctx: Ctx): InterruptState {
  const used = readToday(ctx).reasons.length;
  return { limit: DAILY_INTERRUPT_LIMIT, used, remaining: Math.max(0, DAILY_INTERRUPT_LIMIT - used) };
}

/**
 * Ask to speak. Each reason is spoken at most once a day (so a restart can't repeat a nudge), and never past the budget.
 * Only `allowed: true` means Greg may do the thing.
 */
export function spendInterrupt(ctx: Ctx, reasonInput: unknown): Result<SpendResult> {
  const reason = Reason.safeParse(reasonInput);
  if (!reason.success) return fail("invalid", firstIssue(reason.error));
  const today = readToday(ctx);
  const left = Math.max(0, DAILY_INTERRUPT_LIMIT - today.reasons.length);
  if (today.reasons.includes(reason.data)) return ok({ allowed: false, remaining: left, why: "already" });
  if (left === 0) return ok({ allowed: false, remaining: 0, why: "budget" });
  const next = { day: today.day, reasons: [...today.reasons, reason.data] };
  ctx.db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(KEY, JSON.stringify(next), ctx.now());
  return ok({ allowed: true, remaining: left - 1, why: "spent" });
}
