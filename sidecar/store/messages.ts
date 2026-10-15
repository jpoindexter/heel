import { StoredMessageSchema, type StoredMessage } from "../../shared/api";
import type { Ctx } from "./context";
import { fail, ok, type Result } from "./result";
import { firstIssue } from "./schema";

/** Chat text stays on this Mac for this long, then is deleted (Jason's choice, 2026-10-15). */
export const MESSAGE_RETENTION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type MessagesState = { messages: StoredMessage[]; nextId: number };

function purgeOld(ctx: Ctx): void {
  ctx.db.prepare("DELETE FROM messages WHERE created_at < ?").run(ctx.now() - MESSAGE_RETENTION_DAYS * MS_PER_DAY);
}

/** The visible conversation in order, and the next id the panel may use (above every id ever stored, cleared ones too). */
export function listMessages(ctx: Ctx): MessagesState {
  purgeOld(ctx);
  const rows = ctx.db.prepare("SELECT payload FROM messages WHERE cleared_at IS NULL ORDER BY seq").all();
  const messages = rows.flatMap((row): StoredMessage[] => {
    try {
      const parsed = StoredMessageSchema.safeParse(JSON.parse(String(row.payload)));
      return parsed.success ? [parsed.data] : []; // a row from a future or broken version is skipped, never a crash
    } catch {
      return [];
    }
  });
  const top = ctx.db.prepare("SELECT COALESCE(MAX(client_id), 0) AS top FROM messages").get();
  return { messages, nextId: Number(top?.top ?? 0) + 1 };
}

/** Add a message or update it in place (a receipt got undone, a retry replaced a failure). */
export function saveMessage(ctx: Ctx, input: unknown): Result<StoredMessage> {
  const parsed = StoredMessageSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
  const now = ctx.now();
  ctx.db
    .prepare(
      `INSERT INTO messages (client_id, payload, created_at, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (client_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    )
    .run(parsed.data.id, JSON.stringify(parsed.data), now, now);
  return ok(parsed.data);
}

/** Hide the whole conversation. Returns the moment to pass to `restoreMessages` to bring it back. */
export function clearMessages(ctx: Ctx): { clearedAt: number | null; count: number } {
  const clearedAt = ctx.now();
  const result = ctx.db.prepare("UPDATE messages SET cleared_at = ? WHERE cleared_at IS NULL").run(clearedAt);
  const count = Number(result.changes);
  return { clearedAt: count > 0 ? clearedAt : null, count };
}

export function restoreMessages(ctx: Ctx, clearedAt: number): { count: number } {
  const result = ctx.db.prepare("UPDATE messages SET cleared_at = NULL WHERE cleared_at = ?").run(clearedAt);
  return { count: Number(result.changes) };
}
