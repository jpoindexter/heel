import { useCallback, useEffect, useRef, useState } from "react";
import type { Client } from "../api/client";
import type { Message } from "./thread-model";
import { loadMessages, saveMessage } from "./thread-storage";

/**
 * The messages, readable both as React state (to render) and as a ref (to read the newest value inside async code).
 * `commit` replaces the list; ids come from `nextId`.
 */
export function useThreadState(client: Client) {
  const [messages, setMessages] = useState<Message[]>([]);
  const latest = useRef<Message[]>([]);
  const nextId = useRef(1);

  const commit = useCallback((next: Message[]) => {
    latest.current = next;
    setMessages(next);
  }, []);

  // The conversation from before the last restart. Only fills an empty thread, so it can never overwrite something typed already.
  useEffect(() => {
    let cancelled = false;
    void loadMessages(client).then((kept) => {
      if (cancelled || !kept || latest.current.length > 0) return;
      nextId.current = Math.max(nextId.current, kept.nextId);
      commit(kept.messages);
    });
    return () => {
      cancelled = true;
    };
  }, [client, commit]);

  /** Keep a message (as it is now) across restarts. */
  const persist = useCallback(
    (id: number) => {
      const message = latest.current.find((m) => m.id === id);
      if (message) saveMessage(client, message);
    },
    [client],
  );

  const isBusy = useCallback(() => latest.current.some((m) => m.role === "heel" && m.status === "pending"), []);

  return { messages, latest, nextId, commit, isBusy, persist };
}
