import { MAX_HISTORY_MESSAGES, type ActionOutcomeDto, type ApiResult, type HistoryMessage, type ReceiptDto, type StoredMessage, type TurnResultDto } from "../../shared/api";
import { replyError } from "./today-model";

/** One line of "what Heel did". `undo` is how to reverse it; `undone` once the person has. */
export type Receipt = ReceiptDto;

/**
 * What the thread shows. Everything but a turn still waiting for the AI is a `StoredMessage`, which is exactly what
 * is kept across a restart (`text` is what the model gets; a chip's `label` is what the thread shows instead).
 */
export type Message = StoredMessage | { id: number; role: "heel"; status: "pending" };

export function toReceipts(applied: readonly ActionOutcomeDto[]): Receipt[] {
  return applied.map((o) => ({ ok: o.ok, text: o.ok ? o.message : `Couldn't: ${o.message}`, undo: o.undo ?? null, undone: false }));
}

/** Collapsed receipt label: counts, in words, with failures never hidden. */
export function receiptSummary(receipts: readonly Receipt[]): { text: string; hasFailure: boolean } {
  const failures = receipts.filter((r) => !r.ok).length;
  const done = receipts.length - failures;
  const parts = [done > 0 ? (done === 1 ? "1 thing done" : `${done} things done`) : null, failures > 0 ? `${failures} couldn't be done` : null];
  return { text: parts.filter(Boolean).join(" · "), hasFailure: failures > 0 };
}

/** The last few exchanges the model should see. Pending and failed turns say nothing useful, so they are skipped. */
export function historyFor(messages: readonly Message[]): HistoryMessage[] {
  const said = messages.flatMap((m): HistoryMessage[] => {
    if (m.role === "user") return [{ role: "user", text: m.text }];
    return m.status === "said" ? [{ role: "heel", text: m.say }] : [];
  });
  return said.slice(-MAX_HISTORY_MESSAGES);
}

/** The message that replaces "Thinking…": what Heel said and did, or why it couldn't (with the words to retry). */
export function answerFrom(result: ApiResult<TurnResultDto>, id: number, askedText: string): Message {
  if (result.ok) return { id, role: "heel", status: "said", say: result.data.say, receipts: toReceipts(result.data.applied) };
  return { id, role: "heel", status: "failed", ...replyError(result.error.code, result.error.message), retryText: askedText };
}

export type HeelMessage = Extract<Message, { role: "heel" }>;

/** The panel shows only the latest exchange: what was asked, and Heel's answer (older turns still feed the model's history). */
export function latestExchange(messages: readonly Message[]): { asked: string | null; heel: HeelMessage } | null {
  const last = messages.at(-1);
  if (!last || last.role !== "heel") return null;
  const before = messages.at(-2);
  return { asked: before && before.role === "user" ? (before.label ?? before.text) : null, heel: last };
}

/** The same thread with one receipt marked undone (or put back). Anything else is returned unchanged. */
export function withReceiptUndone(messages: readonly Message[], id: number, index: number, undone: boolean): Message[] {
  return messages.map((m) =>
    m.id === id && m.role === "heel" && m.status === "said" ? { ...m, receipts: m.receipts.map((r, i) => (i === index ? { ...r, undone } : r)) } : m,
  );
}
