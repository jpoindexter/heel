import type { Store } from "../store/store";
import type { Result } from "../store/result";
import type { Action } from "./actions";

export type ActionOutcome = { type: Action["type"]; ok: boolean; message: string };

/** Short task refs (t1, t2) the model sees, mapped to real ids. The model never handles raw ids. */
export type TaskRefs = ReadonlyMap<string, string>;

type Handler<T extends Action["type"]> = (store: Store, action: Extract<Action, { type: T }>, refs: TaskRefs) => ActionOutcome;

const done = (type: Action["type"], message: string): ActionOutcome => ({ type, ok: true, message });
const failed = (type: Action["type"], message: string): ActionOutcome => ({ type, ok: false, message });

function fromResult<T>(type: Action["type"], result: Result<T>, success: string): ActionOutcome {
  return result.ok ? done(type, success) : failed(type, result.error.message);
}

function resolve(refs: TaskRefs, ref: string): string | null {
  return refs.get(ref) ?? null;
}

const unknownRef = (type: Action["type"], ref: string, refs: TaskRefs) =>
  failed(type, `Unknown task "${ref}". Known tasks: ${[...refs.keys()].join(", ") || "none"}.`);

const HANDLERS: { [T in Action["type"]]: Handler<T> } = {
  add_task: (store, a) =>
    fromResult(a.type, store.tasks.add({ title: a.title, nowStep: a.now_step ?? null, source: "capture" }), `Added "${a.title.trim()}".`),

  complete_task: (store, a, refs) => {
    const id = resolve(refs, a.task);
    return id ? fromResult(a.type, store.tasks.complete(id), `Completed ${a.task}.`) : unknownRef(a.type, a.task, refs);
  },

  drop_task: (store, a, refs) => {
    const id = resolve(refs, a.task);
    return id ? fromResult(a.type, store.tasks.drop(id), `Removed ${a.task}. Undo is available.`) : unknownRef(a.type, a.task, refs);
  },

  set_now_step: (store, a, refs) => {
    const id = resolve(refs, a.task);
    return id ? fromResult(a.type, store.tasks.setNowStep(id, a.step), `Updated the next step for ${a.task}.`) : unknownRef(a.type, a.task, refs);
  },

  park_idea: (store, a) => fromResult(a.type, store.parked.park({ idea: a.idea, why: a.why ?? null }), `Parked "${a.idea.trim()}".`),

  start_focus: (store, a, refs) => {
    const taskId = a.task ? resolve(refs, a.task) : null;
    if (a.task && !taskId) return unknownRef(a.type, a.task, refs);
    const input = { goal: a.goal, taskId, bestMin: a.best_min, realisticMin: a.realistic_min, worstMin: a.worst_min };
    return fromResult(a.type, store.focus.start(input), `Focus started: ${a.goal.trim()}.`);
  },

  end_focus: (store, a) => {
    const active = store.focus.active();
    if (!active) return failed(a.type, "No focus session is running.");
    return fromResult(a.type, store.focus.end(active.id, a.outcome), `Focus ended (${a.outcome}).`);
  },
};

/** Apply each action in order. A failed action never stops the rest and is always reported. */
export function executeActions(store: Store, actions: readonly Action[], refs: TaskRefs): ActionOutcome[] {
  return actions.map((action) => {
    const handler = HANDLERS[action.type] as Handler<typeof action.type>;
    return handler(store, action, refs);
  });
}
