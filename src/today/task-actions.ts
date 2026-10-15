import { ParkedResultSchema, TaskResultSchema, UnparkResultSchema, type ParkedIdeaDto, type TaskDto } from "../../shared/api";
import type { Client } from "../api/client";
import type { Notice } from "../ui/Notifier";
import { encouragement, lineOf } from "./encouragement";

type Deps = {
  client: Client;
  refresh: () => Promise<void>;
  /** Take a task off the screen at once (before the helper answers). */
  dropLocally: (id: string) => void;
  notify: (notice: Notice) => void;
  /** How many were finished today before this one. */
  doneToday: () => number;
};

/** One line that says the task and, quietly, that things are getting done; never the same line twice in a row. */
function makeCheer(doneToday: () => number): (title: string) => string {
  let lastLine: string | null = null;
  return (title) => {
    const message = encouragement({ title, doneToday: doneToday() + 1, last: lastLine, rng: Math.random });
    lastLine = lineOf(message);
    return message;
  };
}

/** What the person can do to tasks and parked ideas from the drawer, the Now strip and the Park chip. Each write offers Undo. */
export function createTaskActions({ client, refresh, dropLocally, notify, doneToday }: Deps) {
  const fail = (message: string) => notify({ message, tone: "error" });
  const cheer = makeCheer(doneToday);
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
    notify({ message: action === "drop" ? `Removed: ${task.title}` : cheer(task.title), tone: "info", undo });
    // The row is already gone; this brings the day's count up to date.
    await refresh();
  };


  /** Add a task by hand (no AI). Undo drops it again. */
  const add = async (title: string): Promise<boolean> => {
    const result = await client.post("/tasks", TaskResultSchema, { title });
    if (!result.ok) return fail(result.error.message), false;
    const undo = undoWith(() => client.post(`/tasks/${result.data.task.id}/drop`, TaskResultSchema));
    notify({ message: `Added: ${result.data.task.title}`, tone: "info", undo });
    await refresh();
    return true;
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

  return { complete: (task: TaskDto) => settle(task, "complete"), remove: (task: TaskDto) => settle(task, "drop"), add, park, promote };
}
