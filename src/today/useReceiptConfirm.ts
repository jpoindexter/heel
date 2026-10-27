import { useCallback, type MutableRefObject } from "react";
import { AppWrittenSchema } from "../../shared/api";
import type { Client } from "../api/client";
import { withReceiptWritten, type Message } from "./thread-model";

type Deps = {
  client: Client;
  latest: MutableRefObject<Message[]>;
  commit: (next: Message[]) => void;
  notify: (message: string) => void;
  persist: (id: number) => void;
};

/** The person tapped "Add to Calendar / Reminders / Notes" on a proposal: now, and only now, the app is written to. */
export function useReceiptConfirm({ client, latest, commit, notify, persist }: Deps) {
  return useCallback(
    async (id: number, index: number) => {
      const message = latest.current.find((m) => m.id === id);
      const receipt = message?.role === "heel" && message.status === "said" ? message.receipts[index] : undefined;
      if (!receipt?.proposal) return;
      const result = await client.post("/apps/write", AppWrittenSchema, { write: receipt.proposal });
      if (!result.ok) return notify(result.error.message);
      commit(withReceiptWritten(latest.current, id, index, result.data));
      persist(id);
    },
    [client, commit, latest, notify, persist],
  );
}
