import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchHitDto } from "../../shared/api";
import { client } from "../api/default-client";
import type { Layers } from "../ui/layers";
import { FOUND_MS } from "./search-model";
import type { useHistory } from "./useHistory";
import { useSearch } from "./useSearch";
import type { useTodayState } from "./useTodayState";

type Deps = { state: ReturnType<typeof useTodayState>; layers: Layers; history: ReturnType<typeof useHistory>; openDocument: (id: string, how: { reveal?: boolean; file?: "md" | "pdf" }) => Promise<void> };

/** A row the search led to stays tinted for a moment, then the tint goes. */
function useFound() {
  const [foundId, setFoundId] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const mark = useCallback((id: string) => {
    setFoundId(id);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFoundId(null), FOUND_MS);
  }, []);
  return { foundId, mark };
}

/**
 * What a picked result does: a task → the list with its row tinted; a parked idea → promoted onto the list; a finished
 * task → restored (with Undo, from History's own path); something said → the conversation; a document → opened. The query can go to Heel.
 */
export function useSearchLayer({ state, layers, history, openDocument }: Deps) {
  const search = useSearch(client);
  const { foundId, mark } = useFound();
  const { tasks, thread } = state;

  const onPick = useCallback(
    async (hit: SearchHitDto) => {
      if (hit.kind === "said") return layers.push("reply");
      if (hit.kind === "document") return openDocument(hit.id, {});
      let target: string | null = hit.id;
      if (hit.kind === "parked") target = await tasks.promote({ id: hit.id, idea: hit.text, createdAt: hit.at });
      else if (hit.kind === "done") await history.restore(hit.id, hit.text);
      layers.home();
      if (target) mark(target);
      search.refresh();
    },
    [history, layers, mark, openDocument, search, tasks],
  );

  const onAsk = useCallback((query: string) => void thread.send(query), [thread]);

  return { search, foundId, onPick, onAsk };
}
