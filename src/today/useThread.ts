import { useCallback } from "react";
import { TurnResultSchema, type HistoryMessage } from "../../shared/api";
import type { Client } from "../api/client";
import { celebrate, settle, stumble, thinking } from "../mascot/motion-events";
import { answerFrom, historyFor } from "./thread-model";
import { useReceiptUndo } from "./useReceiptUndo";
import { useStoppable } from "./useStoppable";
import { useThreadState } from "./useThreadState";

type Options = {
  /** Called after any turn or undo so tasks and parked ideas reload. */
  onChanged: () => Promise<void>;
  notify: (message: string) => void;
};

/** The conversation: what was said, what Heel did about it, and how to take it back. Lives as long as the panel window. */
export function useThread(client: Client, { onChanged, notify }: Options) {
  const { messages, latest, nextId, commit, isBusy } = useThreadState();
  const undoReceipt = useReceiptUndo({ client, latest, commit, notify, onChanged });
  const { begin, end, stop } = useStoppable();

  const ask = useCallback(
    async (text: string, history: HistoryMessage[], pendingId: number): Promise<boolean> => {
      void thinking();
      const result = await client.post("/turn", TurnResultSchema, { text, history }, begin());
      end();
      commit(latest.current.map((m) => (m.id === pendingId ? answerFrom(result, pendingId, text) : m)));
      void (result.ok ? celebrate() : result.error.code === "aborted" ? settle() : stumble());
      await onChanged();
      return result.ok;
    },
    [begin, client, commit, end, latest, onChanged],
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
    [ask, commit, isBusy, latest, nextId],
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
    [ask, commit, isBusy, latest],
  );

  return { messages, busy: messages.some((m) => m.role === "heel" && m.status === "pending"), send, retry, stop, undoReceipt };
}
