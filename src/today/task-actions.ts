import { ParkedResultSchema, TaskResultSchema, UnparkResultSchema, type ParkedIdeaDto, type TaskDto } from "../../shared/api";
import type { Client } from "../api/client";
import type { Notice } from "../ui/Notifier";

type Deps = {
  client: Client;
  refresh: () => Promise<void>;
  /** Take a task off the screen at once (before the helper answers). */
  dropLocally: (id: string) => void;
  notify: (notice: Notice) => void;
};

/** What the person can do to tasks and parked ideas from the drawer, the Now strip and the Park chip. Each write offers Undo. */
export function createTaskActions({ client, refresh, dropLocally, notify }: Deps) {
  const fail = (message: string) => notify({ message, tone: "error" });
  const undoWith = (run: () => Promise<unknown>) => () =>
    void run().then(refresh);

  const settle = async (task: TaskDto, action: "complete" | "drop") => {
    dropLocally(task.id);
    const result = await client.post(`/tasks/${task.id}/${action}`, TaskResultSchema);
    if (!result.ok) {
      fail(result.error.message);
      return refresh();
    }
    const undo = undoWith(() => client.post(`/tasks/${task.id}/restore`, TaskResultSchema));
    notify({ message: `${action === "complete" ? "Completed" : "Removed"}: ${task.title}`, tone: "info", undo });
  };

  /** Park what is in the ask box. Undo forgets it again. */
  const park = async (text: string): Promise<boolean> => {
    const result = await client.post("/parked", ParkedResultSchema, { text });
    if (!result.ok) return fail(result.error.message), false;
    const undo = undoWith(() => client.post(`/parked/${result.data.id}/unpark`, UnparkResultSchema));
    notify({ message: `Parked: ${text.trim()}`, tone: "info", undo });
    await refresh();
    return true;
  };

  const promote = async (idea: ParkedIdeaDto) => {
    const result = await client.post(`/parked/${idea.id}/promote`, TaskResultSchema);
    if (!result.ok) return fail(result.error.message);
    notify({ message: `Now a task: ${idea.idea}`, tone: "info" });
    await refresh();
  };

  return { complete: (task: TaskDto) => settle(task, "complete"), remove: (task: TaskDto) => settle(task, "drop"), park, promote };
}
