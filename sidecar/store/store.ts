import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { Ctx } from "./context";
import { currentVersion, migrateDown, migrateUp } from "./migrations";
import { documentsRepository } from "./documents";
import { systemRepositories, todayRepositories } from "./repositories";

export type StoreOptions = {
  /** File path, or ":memory:" (default). */
  path?: string;
  now?: () => number;
  newId?: () => string;
  /** Where documents are written as files (N15). Absent = rows only (tests, a read-only profile). */
  documentsDir?: string;
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
    documents: documentsRepository(ctx, options.documentsDir ?? null),
    ...systemRepositories(ctx),
    schemaVersion: () => currentVersion(db),
    /** A consistent copy of the whole database as one file, safe while open (WAL included). */
    backupTo: (path: string) => void db.prepare("VACUUM INTO ?").run(path),
    /** Every table emptied and rebuilt at the latest version: the wipe (N4). The file stays, shrunk. */
    reset: () => {
      migrateDown(db, 0);
      migrateUp(db, ctx.now);
      db.exec("VACUUM");
    },
    rollbackTo: (version: number) => migrateDown(db, version),
    close: () => db.close(),
  };
}

export type Store = ReturnType<typeof openStore>;
