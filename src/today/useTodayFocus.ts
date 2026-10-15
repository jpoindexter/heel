import type { TaskDto } from "../../shared/api";
import type { Client } from "../api/client";
import { useFocus } from "../focus/useFocus";
import { useNotices } from "../ui/notices";
import type { useTasks } from "./useTasks";

/** The time-box, wired to the task list: a box that ends "done" completes its task, and its errors show as the usual notice. */
export function useTodayFocus(client: Client, active: boolean, tasks: ReturnType<typeof useTasks>, ready: { tasks: TaskDto[] } | null) {
  const notices = useNotices();
  const focus = useFocus(client, {
    active,
    onTaskDone: (id) => {
      const task = ready?.tasks.find((t) => t.id === id);
      if (task) void tasks.complete(task);
    },
    onError: (message) => tasks.showNotice(message, "error"),
  });
  const start: typeof focus.start = async (box) => {
    const started = await focus.start(box);
    if (started) notices.show({ message: `Time-box started: ${box.realisticMin} min`, tone: "info", aboutFocus: true });
    return started;
  };
  return { ...focus, start };
}
