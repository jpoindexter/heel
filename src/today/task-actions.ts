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
  /** The open tasks as the panel has them now (after a refresh), for the last-step offer. */
  openTasks: () => readonly TaskDto[];
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

export type TaskPatch = { size?: TaskDto["size"]; bucket?: string | null; title?: string; nowStep?: string | null; place?: number };

/** Where a task sits among the open tasks that share its parent (0 = first). */
export function placeOf(task: TaskDto, open: readonly TaskDto[]): number {
  return open.filter((t) => t.parentId === task.parentId).findIndex((t) => t.id === task.id);
}

/** The task a just-finished step belonged to, when no open step of it is left: worth an offer to finish it too. */
export function lastStepParent(step: TaskDto, open: readonly TaskDto[]): TaskDto | null {
  if (!step.parentId) return null;
  const parent = open.find((task) => task.id === step.parentId);
  if (!parent || open.some((task) => task.parentId === parent.id && task.id !== step.id)) return null;
  return parent;
}

/** A parked idea becomes a task. Returns the new task's id, so a caller (search) can point at it. */
function makePromote(client: Client, refresh: () => Promise<void>, fail: (message: string) => void, notify: (notice: Notice) => void) {
  return async (idea: ParkedIdeaDto): Promise<string | null> => {
    const result = await client.post(`/parked/${idea.id}/promote`, TaskResultSchema);
    if (!result.ok) return fail(result.error.message), null;
    notify({ message: `Now a task: ${idea.idea}`, tone: "info" });
    await refresh();
    return result.data.task.id;
  };
}

/** A size or bucket tap: written at once, no toast (a tap is its own undo: tap again). */
function makePatch(client: Client, refresh: () => Promise<void>, fail: (message: string) => void) {
  return async (task: TaskDto, change: TaskPatch) => {
    const result = await client.patch(`/tasks/${task.id}`, TaskResultSchema, change);
    if (!result.ok) return fail(result.error.message);
    await refresh();
  };
}

/** Rename, set the next step, or move a task (N7): one PATCH each, and Undo patches the old value back. */
function makeEdits(client: Client, refresh: () => Promise<void>, fail: (message: string) => void, notify: (notice: Notice) => void, openTasks: () => readonly TaskDto[]) {
  const change = async (task: TaskDto, patch: TaskPatch, message: string, back: TaskPatch) => {
    const result = await client.patch(`/tasks/${task.id}`, TaskResultSchema, patch);
    if (!result.ok) return fail(result.error.message);
    notify({ message, tone: "info", undo: () => void client.patch(`/tasks/${task.id}`, TaskResultSchema, back).then(refresh) });
    await refresh();
  };
  return {
    rename: (task: TaskDto, title: string) => change(task, { title }, `Renamed: ${title}`, { title: task.title }),
    setStep: (task: TaskDto, step: string) => change(task, { nowStep: step }, `Next step: ${step}`, { nowStep: task.nowStep }),
    move: (task: TaskDto, place: number) => change(task, { place }, place === 0 && task.parentId === null ? `Now: ${task.title}` : place < placeOf(task, openTasks()) ? `Moved up: ${task.title}` : `Moved down: ${task.title}`, { place: placeOf(task, openTasks()) }),
  };
}

/** What the person can do to tasks and parked ideas from the drawer, the Now strip and the Park chip. Each write offers Undo. */
export function createTaskActions({ client, refresh, dropLocally, notify, doneToday, openTasks }: Deps) {
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
    const parent = action === "complete" ? lastStepParent(task, openTasks()) : null;
    if (parent) notify({ message: `Last step done. Finish “${parent.title}” too?`, tone: "info", choices: [{ label: "Finish it", run: () => void settle(parent, "complete") }, { label: "Undo", run: undo }] });
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

  const promote = makePromote(client, refresh, fail, notify);
  const patch = makePatch(client, refresh, fail);
  return { complete: (task: TaskDto) => settle(task, "complete"), remove: (task: TaskDto) => settle(task, "drop"), add, park, promote, patch, ...makeEdits(client, refresh, fail, notify, openTasks) };
}
