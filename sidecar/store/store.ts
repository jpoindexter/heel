import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { Ctx } from "./context";
import { activeFocus, endFocus, startFocus } from "./focus";
import { getLedger, upsertLedger } from "./ledger";
import { currentVersion, migrateDown, migrateUp } from "./migrations";
import { listParked, parkIdea, promoteParked, unparkIdea } from "./parked";
import type { FocusOutcome, TaskStatus } from "./schema";
import { getBrain, setBrain } from "./settings";
import { addTask, completeTask, dropTask, getTask, listTasks, restoreTask, setNowStep, startTask } from "./tasks";

export type StoreOptions = {
  /** File path, or ":memory:" (default). */
  path?: string;
  now?: () => number;
  newId?: () => string;
};

/**
 * The one place that touches SQLite. node:sqlite is marked experimental by Node, so it stays
 * behind this file: swapping to better-sqlite3 later changes this file and migrations.ts only.
 */
export function openStore(options: StoreOptions = {}) {
  const db = new DatabaseSync(options.path ?? ":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  const ctx: Ctx = { db, now: options.now ?? Date.now, newId: options.newId ?? randomUUID };
  migrateUp(db, ctx.now);

  return {
    tasks: {
      add: (input: unknown) => addTask(ctx, input),
      get: (id: string) => getTask(ctx, id),
      list: (statuses?: readonly TaskStatus[]) => listTasks(ctx, statuses),
      start: (id: string) => startTask(ctx, id),
      complete: (id: string) => completeTask(ctx, id),
      drop: (id: string) => dropTask(ctx, id),
      restore: (id: string) => restoreTask(ctx, id),
      setNowStep: (id: string, step: string | null) => setNowStep(ctx, id, step),
    },
    parked: {
      park: (input: unknown) => parkIdea(ctx, input),
      list: (includePromoted?: boolean) => listParked(ctx, includePromoted),
      promote: (id: string) => promoteParked(ctx, id),
      unpark: (id: string) => unparkIdea(ctx, id),
    },
    focus: {
      start: (input: unknown) => startFocus(ctx, input),
      end: (id: string, outcome: FocusOutcome) => endFocus(ctx, id, outcome),
      active: () => activeFocus(ctx),
    },
    ledger: {
      get: (taskId: string | null) => getLedger(ctx, taskId),
      upsert: (taskId: string | null, patch: unknown) => upsertLedger(ctx, taskId, patch),
    },
    settings: {
      getBrain: () => getBrain(ctx),
      setBrain: (input: unknown) => setBrain(ctx, input),
    },
    schemaVersion: () => currentVersion(db),
    rollbackTo: (version: number) => migrateDown(db, version),
    close: () => db.close(),
  };
}

export type Store = ReturnType<typeof openStore>;
