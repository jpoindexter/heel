import type { ApiResult, ParkedIdeaDto, TaskDto, TasksStateDto } from "../../shared/api";

export type TasksState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; tasks: TaskDto[]; parked: ParkedIdeaDto[]; doneToday: number };

/**
 * What a reload leaves on screen: fresh data where it came, what was already shown where it did not (stale beats blank),
 * and the error only when there was nothing to keep. Parked ideas that fail to reload stay; they never silently vanish.
 */
export function afterRefresh(current: TasksState, tasks: ApiResult<TasksStateDto>, parked: ApiResult<{ parked: ParkedIdeaDto[] }>): TasksState {
  const shown = current.phase === "ready" ? current : null;
  if (!tasks.ok) return shown ?? { phase: "error", message: tasks.error.message };
  return { phase: "ready", tasks: tasks.data.tasks, parked: parked.ok ? parked.data.parked : (shown?.parked ?? []), doneToday: tasks.data.doneToday };
}
