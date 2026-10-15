import { z } from "zod";
import type { Ctx } from "./context";
import { fail, ok, type Result } from "./result";
import { LedgerPatch, firstIssue, type Ledger } from "./schema";

const LedgerRow = z.object({
  id: z.string(),
  task_id: z.string().nullable(),
  outcome: z.string(),
  target: z.string(),
  must: z.string(),
  must_not: z.string(),
  authority: z.string(),
  done_evidence: z.string(),
  now_step: z.string(),
  updated_at: z.number(),
});

function toLedger(row: unknown): Ledger {
  const r = LedgerRow.parse(row);
  return {
    id: r.id,
    taskId: r.task_id,
    outcome: r.outcome,
    target: r.target,
    must: r.must,
    mustNot: r.must_not,
    authority: r.authority,
    doneEvidence: r.done_evidence,
    nowStep: r.now_step,
    updatedAt: r.updated_at,
  };
}

/** nd-working-memory made durable: one ledger per task, plus one global ledger (taskId = null). */
export function getLedger(ctx: Ctx, taskId: string | null): Ledger | null {
  const row = ctx.db.prepare("SELECT * FROM ledger WHERE COALESCE(task_id, 'global') = ?").get(taskId ?? "global");
  return row ? toLedger(row) : null;
}

export function upsertLedger(ctx: Ctx, taskId: string | null, patch: unknown): Result<Ledger> {
  const parsed = LedgerPatch.safeParse(patch);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  const existing = getLedger(ctx, taskId);
  const next = { ...(existing ?? emptyLedger(ctx, taskId)), ...parsed.data, updatedAt: ctx.now() };
  ctx.db
    .prepare(
      `INSERT INTO ledger (id, task_id, outcome, target, must, must_not, authority, done_evidence, now_step, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (COALESCE(task_id, 'global')) DO UPDATE SET
         outcome = excluded.outcome, target = excluded.target, must = excluded.must,
         must_not = excluded.must_not, authority = excluded.authority,
         done_evidence = excluded.done_evidence, now_step = excluded.now_step, updated_at = excluded.updated_at`,
    )
    .run(next.id, taskId, next.outcome, next.target, next.must, next.mustNot, next.authority, next.doneEvidence, next.nowStep, next.updatedAt);
  const saved = getLedger(ctx, taskId);
  return saved ? ok(saved) : fail("not_found", "Ledger was not saved.");
}

function emptyLedger(ctx: Ctx, taskId: string | null): Ledger {
  return {
    id: ctx.newId(),
    taskId,
    outcome: "",
    target: "",
    must: "",
    mustNot: "",
    authority: "",
    doneEvidence: "",
    nowStep: "",
    updatedAt: ctx.now(),
  };
}
