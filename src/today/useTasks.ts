import { useCallback, useMemo, useState } from "react";
import { ParkedListSchema, TasksStateSchema, type ParkedIdeaDto, type TaskDto } from "../../shared/api";
import type { Client } from "../api/client";
import type { Notice } from "../ui/Notifier";
import { useFocusRefresh } from "../ui/useFocusRefresh";
import { createTaskActions } from "./task-actions";

export type TasksState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; tasks: TaskDto[]; parked: ParkedIdeaDto[] };

/** Open tasks, parked ideas, and the Undo toast. `active` = this view is showing (hidden views stay mounted, so drafts survive). */
export function useTasks(client: Client, active: boolean) {
  const [state, setState] = useState<TasksState>({ phase: "loading" });
  const [notice, setNotice] = useState<Notice | null>(null);

  const refresh = useCallback(async () => {
    const [tasks, parked] = await Promise.all([client.get("/tasks", TasksStateSchema), client.get("/parked", ParkedListSchema)]);
    // A failed reload keeps what is already on screen: stale tasks beat a blank panel. Only a first load can show the error.
    if (!tasks.ok) return setState((current) => (current.phase === "ready" ? current : { phase: "error", message: tasks.error.message }));
    setState({ phase: "ready", tasks: tasks.data.tasks, parked: parked.ok ? parked.data.parked : [] });
  }, [client]);

  useFocusRefresh(refresh, active);

  const actions = useMemo(
    () =>
      createTaskActions({
        client,
        refresh,
        dropLocally: (id) => setState((s) => (s.phase === "ready" ? { ...s, tasks: s.tasks.filter((t) => t.id !== id) } : s)),
        notify: setNotice,
      }),
    [client, refresh],
  );

  return {
    state,
    notice,
    refresh,
    ...actions,
    dismissNotice: () => setNotice(null),
    showNotice: (message: string, tone: Notice["tone"] = "info", undo?: () => void) => setNotice({ message, tone, undo }),
  };
}
