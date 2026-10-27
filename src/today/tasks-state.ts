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

/** A first load shorter than this shows nothing: a line that flashes for 80 ms reads as jank, not as help. */
export const LOADING_LINE_DELAY_MS = 200;

export const showLoadingLine = (phase: TasksState["phase"], waitedMs: number): boolean => phase === "loading" && waitedMs >= LOADING_LINE_DELAY_MS;
