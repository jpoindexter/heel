import { useCallback, type MutableRefObject } from "react";
import type { Client } from "../api/client";
import { withReceiptUndone, type Message } from "./thread-model";
import { runUndo } from "./undo";

type Deps = {
  client: Client;
  latest: MutableRefObject<Message[]>;
  commit: (next: Message[]) => void;
  notify: (message: string) => void;
  onChanged: () => Promise<void>;
  /** Keep the message as it is now (a receipt just changed). */
  persist: (id: number) => void;
};

/** Reverse one thing Heel did. Marked undone straight away; put back if the helper says no. */
export function useReceiptUndo({ client, latest, commit, notify, onChanged, persist }: Deps) {
  return useCallback(
    async (id: number, index: number) => {
      const message = latest.current.find((m) => m.id === id);
      const receipt = message?.role === "heel" && message.status === "said" ? message.receipts[index] : undefined;
      if (!receipt?.undo || receipt.undone) return;
      commit(withReceiptUndone(latest.current, id, index, true));
      const result = await runUndo(client, receipt.undo);
      if (!result.ok) {
        commit(withReceiptUndone(latest.current, id, index, false));
        notify(result.error.message);
      }
      persist(id);
      await onChanged();
    },
    [client, latest, commit, notify, onChanged, persist],
  );
}
