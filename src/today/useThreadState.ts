import { useCallback, useRef, useState } from "react";
import type { Message } from "./thread-model";

/**
 * The messages, readable both as React state (to render) and as a ref (to read the newest value inside async code).
 * `commit` replaces the list; ids come from `nextId`.
 */
export function useThreadState() {
  const [messages, setMessages] = useState<Message[]>([]);
  const latest = useRef<Message[]>([]);
  const nextId = useRef(1);

  const commit = useCallback((next: Message[]) => {
    latest.current = next;
    setMessages(next);
  }, []);

  const isBusy = useCallback(() => latest.current.some((m) => m.role === "heel" && m.status === "pending"), []);

  return { messages, latest, nextId, commit, isBusy };
}
