import type { DatabaseSync } from "node:sqlite";

export type Migration = { id: number; name: string; up: string; down: string };

// Applied migrations are never edited: add a new one instead.
export const MIGRATIONS: readonly Migration[] = [
  {
    id: 1,
    name: "init",
    up: `
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 500),
        status TEXT NOT NULL CHECK (status IN ('todo','doing','done','dropped')),
        now_step TEXT,
        source TEXT NOT NULL CHECK (source IN ('manual','capture','inbox')),
        source_ref TEXT,
        position INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER
      );
      CREATE INDEX tasks_status_position ON tasks (status, position);

      CREATE TABLE parked (
        id TEXT PRIMARY KEY,
        idea TEXT NOT NULL CHECK (length(idea) BETWEEN 1 AND 1000),
        why TEXT,
        created_at INTEGER NOT NULL,
        promoted_task_id TEXT REFERENCES tasks (id)
      );

      CREATE TABLE focus_sessions (
        id TEXT PRIMARY KEY,
        goal TEXT NOT NULL CHECK (length(goal) BETWEEN 1 AND 500),
        task_id TEXT REFERENCES tasks (id),
        best_min INTEGER NOT NULL CHECK (best_min > 0),
        realistic_min INTEGER NOT NULL CHECK (realistic_min >= best_min),
        worst_min INTEGER NOT NULL CHECK (worst_min >= realistic_min),
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        outcome TEXT CHECK (outcome IN ('continued','parked_and_returned','done','abandoned'))
      );
      CREATE UNIQUE INDEX focus_one_active ON focus_sessions ((1)) WHERE ended_at IS NULL;

      CREATE TABLE ledger (
        id TEXT PRIMARY KEY,
        task_id TEXT REFERENCES tasks (id),
        outcome TEXT NOT NULL DEFAULT '',
        target TEXT NOT NULL DEFAULT '',
        must TEXT NOT NULL DEFAULT '',
        must_not TEXT NOT NULL DEFAULT '',
        authority TEXT NOT NULL DEFAULT '',
        done_evidence TEXT NOT NULL DEFAULT '',
        now_step TEXT NOT NULL DEFAULT '',
        updated_at INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX ledger_one_per_task ON ledger (COALESCE(task_id, 'global'));
    `,
    down: `
      DROP TABLE ledger;
      DROP TABLE focus_sessions;
      DROP TABLE parked;
      DROP TABLE tasks;
    `,
  },
  {
    id: 2,
    name: "settings",
    up: `
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `,
    down: `DROP TABLE settings;`,
  },
  {
    id: 3,
    name: "messages",
    // The panel's conversation, so it survives a restart. `payload` is the panel's message as JSON (validated on read).
    // Clearing is soft (cleared_at) so "Clear conversation" can be undone; rows are purged after the retention period.
    up: `
      CREATE TABLE messages (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        cleared_at INTEGER
      );
      CREATE UNIQUE INDEX messages_client ON messages (client_id);
    `,
    down: `DROP TABLE messages;`,
  },
  {
    id: 4,
    name: "ways-of-working",
    // N17: a task may carry a size (xs–xl), a bucket of the chosen structure, and an estimate. Values are checked in code,
    // not by CHECK constraints, so the columns can be dropped again.
    up: `
      ALTER TABLE tasks ADD COLUMN size TEXT;
      ALTER TABLE tasks ADD COLUMN bucket TEXT;
      ALTER TABLE tasks ADD COLUMN estimate_min INTEGER;
    `,
    down: `
      ALTER TABLE tasks DROP COLUMN estimate_min;
      ALTER TABLE tasks DROP COLUMN bucket;
      ALTER TABLE tasks DROP COLUMN size;
    `,
  },
];

const ENSURE_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at INTEGER NOT NULL
  )`;

export function currentVersion(db: DatabaseSync): number {
  db.exec(ENSURE_TABLE);
  const row = db.prepare("SELECT COALESCE(MAX(id), 0) AS version FROM schema_migrations").get();
  return Number(row?.version ?? 0);
}

function inTransaction(db: DatabaseSync, run: () => void): void {
  db.exec("BEGIN");
  try {
    run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Apply pending migrations up to `target` (default: latest). Returns the resulting version. */
export function migrateUp(db: DatabaseSync, now: () => number, target = MIGRATIONS.length): number {
  const from = currentVersion(db);
  for (const migration of MIGRATIONS.filter((m) => m.id > from && m.id <= target)) {
    inTransaction(db, () => {
      db.exec(migration.up);
      db.prepare("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)").run(
        migration.id,
        migration.name,
        now(),
      );
    });
  }
  return currentVersion(db);
}

/** Roll back applied migrations down to `target` (0 = empty). Returns the resulting version. */
export function migrateDown(db: DatabaseSync, target = 0): number {
  const from = currentVersion(db);
  for (const migration of [...MIGRATIONS].reverse().filter((m) => m.id <= from && m.id > target)) {
    inTransaction(db, () => {
      db.exec(migration.down);
      db.prepare("DELETE FROM schema_migrations WHERE id = ?").run(migration.id);
    });
  }
  return currentVersion(db);
}
