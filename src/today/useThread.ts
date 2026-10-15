import { useCallback, useRef, useState } from "react";
import { TurnResultSchema, type HistoryMessage } from "../../shared/api";
import type { Client } from "../api/client";
import { celebrate, stumble, thinking } from "../mascot/motion-events";
import { replyError } from "./today-model";
import { historyFor, toReceipts, type Message } from "./thread-model";
import { runUndo } from "./undo";

type Options = {
  /** Called after any turn or undo so tasks and parked ideas reload. */
  onChanged: () => Promise<void>;
  notify: (message: string) => void;
};

/** The conversation: what was said, what Heel did about it, and how to take it back. Lives as long as the panel window. */
export function useThread(client: Client, { onChanged, notify }: Options) {
  const [messages, setMessages] = useState<Message[]>([]);
  const latest = useRef<Message[]>([]);
  const nextId = useRef(1);

  const commit = useCallback((next: Message[]) => {
    latest.current = next;
    setMessages(next);
  }, []);

  const isBusy = () => latest.current.some((m) => m.role === "heel" && m.status === "pending");

  const ask = useCallback(
    async (text: string, history: HistoryMessage[], pendingId: number): Promise<boolean> => {
      void thinking();
      const result = await client.post("/turn", TurnResultSchema, { text, history });
      const answer: Message = result.ok
        ? { id: pendingId, role: "heel", status: "said", say: result.data.say, receipts: toReceipts(result.data.applied) }
        : { id: pendingId, role: "heel", status: "failed", ...replyError(result.error.code, result.error.message), retryText: text };
      commit(latest.current.map((m) => (m.id === pendingId ? answer : m)));
      void (result.ok ? celebrate() : stumble());
      await onChanged();
      return result.ok;
    },
    [client, commit, onChanged],
  );

  /** Ask the AI. Returns true when it answered, so the caller can clear the ask box. */
  const send = useCallback(
    async (text: string, label?: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || isBusy()) return false;
      const history = historyFor(latest.current);
      const pendingId = nextId.current + 1;
      commit([...latest.current, { id: nextId.current, role: "user", text: trimmed, label }, { id: pendingId, role: "heel", status: "pending" }]);
      nextId.current += 2;
      return ask(trimmed, history, pendingId);
    },
    [ask, commit],
  );

  /** Ask again for a failed turn, in place: the person's words are already in the thread. */
  const retry = useCallback(
    (id: number) => {
      const index = latest.current.findIndex((m) => m.id === id);
      const failed = latest.current[index];
      if (!failed || failed.role !== "heel" || failed.status !== "failed" || isBusy()) return;
      const history = historyFor(latest.current.slice(0, Math.max(0, index - 1)));
      commit(latest.current.map((m) => (m.id === id ? { id, role: "heel", status: "pending" } : m)));
      void ask(failed.retryText, history, id);
    },
    [ask, commit],
  );

  const markUndone = useCallback(
    (id: number, index: number, undone: boolean) =>
      commit(
        latest.current.map((m) =>
          m.id === id && m.role === "heel" && m.status === "said"
            ? { ...m, receipts: m.receipts.map((r, i) => (i === index ? { ...r, undone } : r)) }
            : m,
        ),
      ),
    [commit],
  );

  /** Reverse one thing Heel did. Marked undone straight away; put back if the helper says no. */
  const undoReceipt = useCallback(
    async (id: number, index: number) => {
      const message = latest.current.find((m) => m.id === id);
      const receipt = message?.role === "heel" && message.status === "said" ? message.receipts[index] : undefined;
      if (!receipt?.undo || receipt.undone) return;
      markUndone(id, index, true);
      const result = await runUndo(client, receipt.undo);
      if (!result.ok) {
        markUndone(id, index, false);
        notify(result.error.message);
      }
      await onChanged();
    },
    [client, markUndone, notify, onChanged],
  );

  return { messages, busy: messages.some((m) => m.role === "heel" && m.status === "pending"), send, retry, undoReceipt };
}
