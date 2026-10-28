import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openStore } from "./store";

describe("database file mode", () => {
  it("opens the database and its WAL files readable by this user only", () => {
    const path = join(mkdtempSync(join(tmpdir(), "heel-mode-")), "heel.db");
    openStore({ path }).tasks.add({ title: "Keep me private" });
    for (const file of [path, `${path}-wal`, `${path}-shm`]) expect(statSync(file).mode & 0o777, file).toBe(0o600);
  });
});
