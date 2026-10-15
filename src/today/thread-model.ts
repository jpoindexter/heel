import { MAX_HISTORY_MESSAGES, type ActionOutcomeDto, type ApiResult, type HistoryMessage, type TurnResultDto, type UndoDto } from "../../shared/api";
import { replyError } from "./today-model";

/** One line of "what Heel did". `undo` is how to reverse it; `undone` once the person has. */
export type Receipt = { ok: boolean; text: string; undo: UndoDto | null; undone: boolean };

export type Message =
  /** `text` is what the model gets; `label` (a chip's name) is what the thread shows instead, when given. */
  | { id: number; role: "user"; text: string; label?: string }
  | { id: number; role: "heel"; status: "pending" }
  | { id: number; role: "heel"; status: "said"; say: string; receipts: Receipt[] }
  | { id: number; role: "heel"; status: "failed"; message: string; offerSettings: boolean; retryText: string };

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

/** Auto-follow new messages only while the person is already at the bottom; otherwise offer "Jump to latest". */
export const NEAR_BOTTOM_PX = 48;

export function isNearBottom(el: { scrollHeight: number; scrollTop: number; clientHeight: number }): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
}

/** The message that replaces "Thinking…": what Heel said and did, or why it couldn't (with the words to retry). */
export function answerFrom(result: ApiResult<TurnResultDto>, id: number, askedText: string): Message {
  if (result.ok) return { id, role: "heel", status: "said", say: result.data.say, receipts: toReceipts(result.data.applied) };
  return { id, role: "heel", status: "failed", ...replyError(result.error.code, result.error.message), retryText: askedText };
}

/** The same thread with one receipt marked undone (or put back). Anything else is returned unchanged. */
export function withReceiptUndone(messages: readonly Message[], id: number, index: number, undone: boolean): Message[] {
  return messages.map((m) =>
    m.id === id && m.role === "heel" && m.status === "said" ? { ...m, receipts: m.receipts.map((r, i) => (i === index ? { ...r, undone } : r)) } : m,
  );
}
