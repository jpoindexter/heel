import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { currentVersion, inTransaction, migrateDown, migrateUp } from "./migrations";
import { openStore } from "./store";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tableNames(db: DatabaseSync): string[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => String(row.name));
}

describe("migrations", () => {
  it("applies up, rolls all the way back down, and applies again", () => {
    const db = new DatabaseSync(":memory:");
    const now = () => 1;
    expect(migrateUp(db, now)).toBe(6);
    expect(tableNames(db)).toEqual(["documents", "focus_sessions", "ledger", "messages", "parked", "schema_migrations", "settings", "tasks"]);
    expect(migrateDown(db, 0)).toBe(0);
    expect(tableNames(db)).toEqual(["schema_migrations"]);
    expect(migrateUp(db, now)).toBe(6);
    expect(currentVersion(db)).toBe(6);
  });

  it("undoes a whole wipe when a step inside it fails, keeping the data", () => {
    const db = new DatabaseSync(":memory:");
    migrateUp(db, () => 1);
    db.exec("INSERT INTO tasks (id, title, status, source, position, created_at, updated_at) VALUES ('t1', 'Keep me', 'todo', 'manual', 0, 1, 1)");
    expect(() =>
      inTransaction(db, () => {
        migrateDown(db, 0);
        throw new Error("disk full");
      }),
    ).toThrow("disk full");
    expect(currentVersion(db)).toBe(6);
    expect(db.prepare("SELECT count(*) AS n FROM tasks").get()?.n).toBe(1);
  });

  it("is idempotent: running up twice does not re-apply", () => {
    const db = new DatabaseSync(":memory:");
    migrateUp(db, () => 1);
    expect(migrateUp(db, () => 2)).toBe(6);
    const row = db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get();
    expect(Number(row?.n)).toBe(6);
  });

  it("rolls back only the newest migration and keeps earlier data tables", () => {
    const db = new DatabaseSync(":memory:");
    migrateUp(db, () => 1);
    expect(migrateDown(db, 2)).toBe(2);
    expect(tableNames(db)).toEqual(["focus_sessions", "ledger", "parked", "schema_migrations", "settings", "tasks"]);
    expect(migrateDown(db, 1)).toBe(1);
    expect(tableNames(db)).toEqual(["focus_sessions", "ledger", "parked", "schema_migrations", "tasks"]);
  });

  it("enforces one active focus session in the database itself, not only in app code", () => {
    const db = new DatabaseSync(":memory:");
    migrateUp(db, () => 1);
    const insert = db.prepare(
      "INSERT INTO focus_sessions (id, goal, best_min, realistic_min, worst_min, started_at) VALUES (?, 'g', 1, 2, 3, 1)",
    );
    insert.run("a");
    expect(() => insert.run("b")).toThrow();
  });
});

describe("persistence", () => {
  it("keeps tasks after the store is closed and reopened", () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-store-"));
    dirs.push(dir);
    const path = join(dir, "heel.db");

    const first = openStore({ path });
    first.tasks.add({ title: "Survive a restart" });
    first.close();

    const second = openStore({ path });
    expect(second.tasks.list().map((t) => t.title)).toEqual(["Survive a restart"]);
    expect(second.schemaVersion()).toBe(6);
    second.close();
  });
});
