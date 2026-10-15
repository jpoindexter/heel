import { useCallback, useEffect, useRef, useState } from "react";
import { SearchResultSchema, type SearchHitDto } from "../../shared/api";
import type { Client } from "../api/client";
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS, moveIndex } from "./search-model";

export type SearchState = { query: string; hits: SearchHitDto[]; active: number; searching: boolean; error: string | null };

/** The search box: results as you type (debounced), one active row for the arrow keys. The query is kept while the layer is away. */
export function useSearch(client: Client) {
  const [state, setState] = useState<SearchState>({ query: "", hits: [], active: -1, searching: false, error: null });
  const latest = useRef(0);

  const run = useCallback(
    async (query: string) => {
      const mine = ++latest.current;
      if (query.trim().length < SEARCH_MIN_CHARS) return setState((s) => ({ ...s, hits: [], active: -1, searching: false, error: null }));
      const result = await client.get(`/search?q=${encodeURIComponent(query.trim())}`, SearchResultSchema);
      if (mine !== latest.current) return;
      setState((s) => (result.ok ? { ...s, hits: result.data.hits, active: result.data.hits.length > 0 ? 0 : -1, searching: false, error: null } : { ...s, searching: false, error: result.error.message }));
    },
    [client],
  );

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const setQuery = useCallback(
    (query: string) => {
      setState((s) => ({ ...s, query, searching: query.trim().length >= SEARCH_MIN_CHARS }));
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void run(query), SEARCH_DEBOUNCE_MS);
    },
    [run],
  );

  const move = useCallback((delta: 1 | -1) => setState((s) => ({ ...s, active: moveIndex(s.active, delta, s.hits.length) })), []);
  const setActive = useCallback((active: number) => setState((s) => ({ ...s, active })), []);
  /** After a pick that changed things (a restore, a promotion), the same query runs again. */
  const refresh = useCallback(() => void run(latestQuery.current), [run]);
  const latestQuery = useRef(state.query);
  latestQuery.current = state.query;

  return { state, setQuery, move, setActive, refresh };
}
