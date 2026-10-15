import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { currentVersion, migrateDown, migrateUp } from "./migrations";
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
    expect(migrateUp(db, now)).toBe(4);
    expect(tableNames(db)).toEqual(["focus_sessions", "ledger", "messages", "parked", "schema_migrations", "settings", "tasks"]);
    expect(migrateDown(db, 0)).toBe(0);
    expect(tableNames(db)).toEqual(["schema_migrations"]);
    expect(migrateUp(db, now)).toBe(4);
    expect(currentVersion(db)).toBe(4);
  });

  it("is idempotent: running up twice does not re-apply", () => {
    const db = new DatabaseSync(":memory:");
    migrateUp(db, () => 1);
    expect(migrateUp(db, () => 2)).toBe(4);
    const row = db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get();
    expect(Number(row?.n)).toBe(4);
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
    expect(second.schemaVersion()).toBe(4);
    second.close();
  });
});
