import type { MailSource } from "../mail/source";
import type { Store } from "../store/store";
import type { Result } from "../store/result";
import type { Action } from "./actions";
import type { DocumentDto } from "../../shared/api";

/** What an action may touch outside the store. Mail is absent in tests and on a Mac without Mail; the PDF printer needs this Mac. */
export type SideEffects = { mail?: Pick<MailSource, "draft">; makePdf?: (id: string) => Promise<Result<DocumentDto>> };

/** How the panel can reverse a write: the route it calls and the id it calls it with. */
export type Undo = { kind: "restore_task" | "drop_task" | "unpark" | "delete_document"; id: string };

export type ActionOutcome = { type: Action["type"]; ok: boolean; message: string; undo?: Undo; /** A document the person can open (N15), and which of its files. */ document?: string; file?: "md" | "pdf" };

/** Short task refs (t1, t2) the model sees, mapped to real ids. The model never handles raw ids. */
export type TaskRefs = ReadonlyMap<string, string>;

type Handler<T extends Action["type"]> = (store: Store, action: Extract<Action, { type: T }>, refs: TaskRefs, side: SideEffects) => ActionOutcome | Promise<ActionOutcome>;

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
      store.tasks.add({ title: a.title, nowStep: a.now_step ?? null, source: "capture", size: a.size ?? null, bucket: a.bucket ?? null }),
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

  /** Opens a draft in Mail, addressed and filled in. The person reads it there and sends it themselves, or closes it. */
  draft_email: async (_store, a, _refs, side) => {
    if (!side.mail) return failed(a.type, "Mail isn't available here, so no draft was opened.");
    const result = await side.mail.draft({ to: a.to ?? "", subject: a.subject, body: a.body });
    if (!result.ok) return failed(a.type, result.error.message);
    const who = a.to?.trim() ? ` to ${a.to.trim()}` : "";
    return { type: a.type, ok: true, message: `Opened a draft${who} in Mail: "${a.subject.trim()}". Not sent.` };
  },

  /** Saves what Heel wrote as a Markdown file in the app's documents folder. Nothing leaves this Mac. */
  write_document: (store, a) => {
    const result = store.documents.create({ title: a.title, body: a.body });
    if (!result.ok) return failed(a.type, result.error.message);
    return { type: a.type, ok: true, message: `Saved "${result.value.title}" as a document.`, undo: { kind: "delete_document", id: result.value.id }, document: result.value.id, file: "md" };
  },

  /** "Make that a PDF": the newest document (or the one whose title the model names) rendered next to its .md, on this Mac. */
  make_pdf: async (store, a, _refs, side) => {
    const doc = store.documents.latest(a.title);
    if (!doc) return failed(a.type, "There is no document to make a PDF of yet.");
    if (!side.makePdf) return failed(a.type, "Making PDFs isn't available here.");
    const made = await side.makePdf(doc.id);
    if (!made.ok) return failed(a.type, made.error.message);
    return { type: a.type, ok: true, message: `Made a PDF of "${doc.title}".`, document: doc.id, file: "pdf" };
  },
};

/** Apply each action in order. A failed action never stops the rest and is always reported. */
export async function executeActions(store: Store, actions: readonly Action[], refs: TaskRefs, side: SideEffects = {}): Promise<ActionOutcome[]> {
  const outcomes: ActionOutcome[] = [];
  for (const action of actions) {
    const handler = HANDLERS[action.type] as Handler<typeof action.type>;
    outcomes.push(await handler(store, action, refs, side));
  }
  return outcomes;
}
