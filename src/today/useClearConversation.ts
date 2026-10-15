import { useCallback, type MutableRefObject } from "react";
import type { Client } from "../api/client";
import type { Message } from "./thread-model";
import { clearConversation, loadMessages } from "./thread-storage";

type Deps = {
  client: Client;
  commit: (next: Message[]) => void;
  isBusy: () => boolean;
  latest: MutableRefObject<Message[]>;
  notify: (message: string) => void;
  /** The conversation was cleared: show it, with a way to bring it back. */
  onCleared: (undo: () => void) => void;
};

/** Empty the thread. What was hidden stays on disk for the Undo window and comes back exactly as it was. */
export function useClearConversation({ client, commit, isBusy, latest, notify, onCleared }: Deps) {
  return useCallback(async () => {
    if (isBusy() || latest.current.length === 0) return;
    const cleared = await clearConversation(client);
    if ("error" in cleared) return notify(cleared.error);
    commit([]);
    onCleared(() => {
      void cleared.restore().then(async (restored) => {
        const kept = restored ? await loadMessages(client) : null;
        if (kept && latest.current.length === 0) commit(kept.messages);
      });
    });
  }, [client, commit, isBusy, latest, notify, onCleared]);
}
