import { useCallback, useMemo, useRef, useState } from "react";
import { ParkedListSchema, TasksStateSchema, type ParkedIdeaDto, type TaskDto } from "../../shared/api";
import type { Client } from "../api/client";
import type { Notice } from "../ui/notice-model";
import { useNotices } from "../ui/notices";
import { useFocusRefresh } from "../ui/useFocusRefresh";
import { createTaskActions } from "./task-actions";

export type TasksState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; tasks: TaskDto[]; parked: ParkedIdeaDto[]; doneToday: number };

/** Open tasks, parked ideas, and their notices (Added, Parked, Completed… with Undo). `active` = this view is showing (hidden views stay mounted, so drafts survive). */
export function useTasks(client: Client, active: boolean) {
  const [state, setState] = useState<TasksState>({ phase: "loading" });
  const notices = useNotices();

  const refresh = useCallback(async () => {
    const [tasks, parked] = await Promise.all([client.get("/tasks", TasksStateSchema), client.get("/parked", ParkedListSchema)]);
    // A failed reload keeps what is already on screen: stale tasks beat a blank panel. Only a first load can show the error.
    if (!tasks.ok) return setState((current) => (current.phase === "ready" ? current : { phase: "error", message: tasks.error.message }));
    setState({ phase: "ready", tasks: tasks.data.tasks, parked: parked.ok ? parked.data.parked : [], doneToday: tasks.data.doneToday });
  }, [client]);
  const latest = useRef(state);
  latest.current = state;

  useFocusRefresh(refresh, active);

  const actions = useMemo(
    () =>
      createTaskActions({
        client,
        refresh,
        dropLocally: (id) => setState((s) => (s.phase === "ready" ? { ...s, tasks: s.tasks.filter((t) => t.id !== id) } : s)),
        notify: notices.show,
        doneToday: () => (latest.current.phase === "ready" ? latest.current.doneToday : 0),
        openTasks: () => (latest.current.phase === "ready" ? latest.current.tasks : []),
      }),
    [client, refresh, notices],
  );

  return {
    state,
    refresh,
    ...actions,
    showNotice: (message: string, tone: Notice["tone"] = "info", undo?: () => void) => notices.show({ message, tone, undo }),
  };
}
