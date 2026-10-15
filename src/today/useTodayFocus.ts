import type { TaskDto } from "../../shared/api";
import type { Client } from "../api/client";
import { useFocus } from "../focus/useFocus";
import type { useTasks } from "./useTasks";

/** The time-box, wired to the task list: a box that ends "done" completes its task, and its errors show as the usual notice. */
export function useTodayFocus(client: Client, active: boolean, tasks: ReturnType<typeof useTasks>, ready: { tasks: TaskDto[] } | null) {
  return useFocus(client, {
    active,
    onTaskDone: (id) => {
      const task = ready?.tasks.find((t) => t.id === id);
      if (task) void tasks.complete(task);
    },
    onError: (message) => tasks.showNotice(message, "error"),
  });
}
