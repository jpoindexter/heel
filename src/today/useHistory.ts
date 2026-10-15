import { useCallback, useEffect, useState } from "react";
import { HistorySchema, TaskResultSchema, type HistoryDto } from "../../shared/api";
import type { Client } from "../api/client";

/** How far back the list goes; the week strip is always the last seven days. */
const HISTORY_DAYS = 30;

export type HistoryState = { phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; history: HistoryDto };

type Options = {
  active: boolean;
  /** A task came back to the list: reload what the panel shows. */
  onRestored: (title: string, undo: () => void) => void;
};

/** What was finished, by day, loaded when its layer opens. Restore puts a task back on the list, with Undo. */
export function useHistory(client: Client, { active, onRestored }: Options) {
  const [state, setState] = useState<HistoryState>({ phase: "loading" });

  const load = useCallback(async () => {
    const result = await client.get(`/history?days=${HISTORY_DAYS}`, HistorySchema);
    setState(result.ok ? { phase: "ready", history: result.data } : { phase: "error", message: result.error.message });
  }, [client]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const restore = useCallback(
    async (id: string, title: string) => {
      const result = await client.post(`/tasks/${id}/restore`, TaskResultSchema);
      if (!result.ok) return setState({ phase: "error", message: result.error.message });
      await load();
      onRestored(title, () => void client.post(`/tasks/${id}/complete`, TaskResultSchema).then(load));
    },
    [client, load, onRestored],
  );

  return { state, load, restore };
}
