import { useCallback, type MutableRefObject } from "react";
import { TurnResultSchema, type HistoryMessage } from "../../shared/api";
import type { Client } from "../api/client";
import { beginWork, celebrate, settle, stumble } from "../mascot/motion-events";
import type { Notice } from "../ui/notice-model";
import { answerFrom, answerNotice, historyFor, type Message } from "./thread-model";
import { useClearConversation } from "./useClearConversation";
import { useReceiptConfirm } from "./useReceiptConfirm";
import { useReceiptUndo } from "./useReceiptUndo";
import { useStoppable } from "./useStoppable";
import { useThreadState } from "./useThreadState";

type Options = {
  /** Called after any turn or undo so tasks and parked ideas reload. */
  onChanged: () => Promise<void>;
  notify: (message: string) => void;
  /** The conversation was cleared: show it, with a way to bring it back. */
  onCleared: (undo: () => void) => void;
  /** An answer landed: what Heel did first (with Undo), for when the panel is closed and nobody saw it. */
  onAnswered: (notice: Notice) => void;
};

type Ask = (text: string, history: HistoryMessage[], pendingId: number) => Promise<boolean>;
type RetryDeps = { ask: Ask; commit: (next: Message[]) => void; isBusy: () => boolean; latest: MutableRefObject<Message[]> };

/** Ask again for a failed turn, in place: the person's words are already in the thread. */
function useRetry({ ask, commit, isBusy, latest }: RetryDeps) {
  return useCallback(
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
}

/** The conversation: what was said, what Heel did about it, and how to take it back. Lives as long as the panel window. */
export function useThread(client: Client, { onChanged, notify, onCleared, onAnswered }: Options) {
  const { messages, latest, nextId, commit, isBusy, persist } = useThreadState(client);
  const undoReceipt = useReceiptUndo({ client, latest, commit, notify, onChanged, persist });
  const confirmReceipt = useReceiptConfirm({ client, latest, commit, notify, persist });
  const { begin, end, stop } = useStoppable();
  const ask = useCallback(
    async (text: string, history: HistoryMessage[], pendingId: number): Promise<boolean> => {
      const endWork = beginWork("turn");
      const result = await client.post("/turn", TurnResultSchema, { text, history }, begin());
      end();
      endWork();
      const answer = answerFrom(result, pendingId, text);
      commit(latest.current.map((m) => (m.id === pendingId ? answer : m)));
      persist(pendingId);
      void (result.ok ? celebrate() : result.error.code === "aborted" ? settle() : stumble());
      if (result.ok || result.error.code !== "aborted") onAnswered(answerNotice(answer, (index) => void undoReceipt(pendingId, index)));
      await onChanged();
      return result.ok;
    },
    [begin, client, commit, end, latest, onAnswered, onChanged, persist, undoReceipt],
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
      persist(pendingId - 1);
      return ask(trimmed, history, pendingId);
    },
    [ask, commit, isBusy, latest, nextId, persist],
  );

  const retry = useRetry({ ask, commit, isBusy, latest });
  const clear = useClearConversation({ client, commit, isBusy, latest, notify, onCleared });

  return { messages, clear, busy: messages.some((m) => m.role === "heel" && m.status === "pending"), send, retry, stop, undoReceipt, confirmReceipt };
}
