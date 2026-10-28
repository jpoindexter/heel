import { randomUUID } from "node:crypto";
import { chmodSync, existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import type { Ctx } from "./context";
import { currentVersion, inTransaction, migrateDown, migrateUp } from "./migrations";
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

/** The file holds the person's tasks and mail: readable by this user only (V1-10). SQLite gives -wal/-shm the main file's mode. */
function ownerOnly(path: string): void {
  for (const file of [path, `${path}-wal`, `${path}-shm`]) if (existsSync(file)) chmodSync(file, 0o600);
}

/**
 * The one place that touches SQLite. node:sqlite is marked experimental by Node, so it stays
 * behind this file: swapping to better-sqlite3 later changes this file, repositories.ts and migrations.ts only.
 */
export function openStore(options: StoreOptions = {}) {
  const db = new DatabaseSync(options.path ?? ":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  if (options.path) ownerOnly(options.path);
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
      // One unit: a failure halfway leaves the data as it was, never half-dropped.
      inTransaction(db, () => {
        migrateDown(db, 0);
        migrateUp(db, ctx.now);
      });
      db.exec("VACUUM");
    },
    rollbackTo: (version: number) => migrateDown(db, version),
    close: () => db.close(),
  };
}

export type Store = ReturnType<typeof openStore>;
