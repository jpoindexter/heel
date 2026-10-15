import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { Ctx } from "./context";
import { currentVersion, migrateDown, migrateUp } from "./migrations";
import { systemRepositories, todayRepositories } from "./repositories";

export type StoreOptions = {
  /** File path, or ":memory:" (default). */
  path?: string;
  now?: () => number;
  newId?: () => string;
};

/**
 * The one place that touches SQLite. node:sqlite is marked experimental by Node, so it stays
 * behind this file: swapping to better-sqlite3 later changes this file, repositories.ts and migrations.ts only.
 */
export function openStore(options: StoreOptions = {}) {
  const db = new DatabaseSync(options.path ?? ":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  const ctx: Ctx = { db, now: options.now ?? Date.now, newId: options.newId ?? randomUUID };
  migrateUp(db, ctx.now);

  return {
    ...todayRepositories(ctx),
    ...systemRepositories(ctx),
    schemaVersion: () => currentVersion(db),
    rollbackTo: (version: number) => migrateDown(db, version),
    close: () => db.close(),
  };
}

export type Store = ReturnType<typeof openStore>;
