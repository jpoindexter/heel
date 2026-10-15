import { useCallback, useRef } from "react";

/** One request that can be stopped from outside: `begin` hands out its signal, `end` forgets it, `stop` aborts it. */
export function useStoppable() {
  const current = useRef<AbortController | null>(null);
  const begin = useCallback((): AbortSignal => {
    current.current = new AbortController();
    return current.current.signal;
  }, []);
  const end = useCallback(() => {
    current.current = null;
  }, []);
  const stop = useCallback(() => current.current?.abort(), []);
  return { begin, end, stop };
}
