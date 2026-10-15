import type { Store } from "../store/store";
import type { Result } from "../store/result";
import type { Action } from "./actions";

/** How the panel can reverse a write: the route it calls and the id it calls it with. */
export type Undo = { kind: "restore_task" | "drop_task" | "unpark"; id: string };

export type ActionOutcome = { type: Action["type"]; ok: boolean; message: string; undo?: Undo };

/** Short task refs (t1, t2) the model sees, mapped to real ids. The model never handles raw ids. */
export type TaskRefs = ReadonlyMap<string, string>;

type Handler<T extends Action["type"]> = (store: Store, action: Extract<Action, { type: T }>, refs: TaskRefs) => ActionOutcome;

const failed = (type: Action["type"], message: string): ActionOutcome => ({ type, ok: false, message });

function fromResult<T>(type: Action["type"], result: Result<T>, success: (value: T) => string, undo?: (value: T) => Undo): ActionOutcome {
  if (!result.ok) return failed(type, result.error.message);
  return { type, ok: true, message: success(result.value), undo: undo?.(result.value) };
}

const unknownRef = (type: Action["type"], ref: string, refs: TaskRefs) =>
  failed(type, `Unknown task "${ref}". Known tasks: ${[...refs.keys()].join(", ") || "none"}.`);

/** Receipts name tasks by title: the person never sees refs. */
function titleOf(store: Store, id: string): string {
  const task = store.tasks.get(id);
  return task.ok ? task.value.title : "that task";
}

const HANDLERS: { [T in Action["type"]]: Handler<T> } = {
  add_task: (store, a) =>
    fromResult(
      a.type,
      store.tasks.add({ title: a.title, nowStep: a.now_step ?? null, source: "capture" }),
      () => `Added "${a.title.trim()}".`,
      (task) => ({ kind: "drop_task", id: task.id }),
    ),

  complete_task: (store, a, refs) => {
    const id = refs.get(a.task);
    if (!id) return unknownRef(a.type, a.task, refs);
    const title = titleOf(store, id);
    return fromResult(a.type, store.tasks.complete(id), () => `Completed "${title}".`, () => ({ kind: "restore_task", id }));
  },

  drop_task: (store, a, refs) => {
    const id = refs.get(a.task);
    if (!id) return unknownRef(a.type, a.task, refs);
    const title = titleOf(store, id);
    return fromResult(a.type, store.tasks.drop(id), () => `Removed "${title}".`, () => ({ kind: "restore_task", id }));
  },

  set_now_step: (store, a, refs) => {
    const id = refs.get(a.task);
    if (!id) return unknownRef(a.type, a.task, refs);
    return fromResult(a.type, store.tasks.setNowStep(id, a.step), () => `Updated the next step for "${titleOf(store, id)}".`);
  },

  park_idea: (store, a) =>
    fromResult(
      a.type,
      store.parked.park({ idea: a.idea, why: a.why ?? null }),
      () => `Parked "${a.idea.trim()}".`,
      (parked) => ({ kind: "unpark", id: parked.id }),
    ),
};

/** Apply each action in order. A failed action never stops the rest and is always reported. */
export function executeActions(store: Store, actions: readonly Action[], refs: TaskRefs): ActionOutcome[] {
  return actions.map((action) => {
    const handler = HANDLERS[action.type] as Handler<typeof action.type>;
    return handler(store, action, refs);
  });
}
