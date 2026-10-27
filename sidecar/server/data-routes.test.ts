import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { BackupResultSchema, DataPreviewSchema, WipeResultSchema, envelope } from "../../shared/api";
import { openStore } from "../store/store";
import { backupFolderName, sizeOf } from "./data-routes";
import { setup } from "./test-app";

const preview = envelope(DataPreviewSchema);
const backup = envelope(BackupResultSchema);
const wiped = envelope(WipeResultSchema);

/** A helper on a real folder: a database file, a document, a skill of yours, and the files a wipe must leave alone. */
function dataFolder() {
  const dataDir = mkdtempSync(join(tmpdir(), "heel-data-"));
  const store = openStore({ path: join(dataDir, "heel.db"), documentsDir: join(dataDir, "documents") });
  writeFileSync(join(dataDir, "sidecar.json"), '{"port":1,"token":"x"}');
  writeFileSync(join(dataDir, "sidecar.log"), "a line\n");
  mkdirSync(join(dataDir, "pdf"));
  writeFileSync(join(dataDir, "pdf", "printer"), "binary");
  const app = setup({}, {}, undefined, store, { dataDir });
  store.tasks.add({ title: "one" });
  store.tasks.add({ title: "two" });
  store.parked.park({ idea: "later" });
  store.messages.save({ id: 1, role: "user", text: "hi" });
  store.documents.create({ title: "Notes", body: "# Notes" });
  return { dataDir, ...app };
}

describe("GET /data/preview", () => {
  it("counts every row a wipe removes and lists the folder's entries with sizes", async () => {
    const { json, dataDir } = dataFolder();
    const result = preview.parse(await json("/data/preview"));
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.counts).toEqual({ tasks: 2, parked: 1, messages: 1, documents: 1, skills: 0 });
    expect(result.data.dataDir).toBe(dataDir);
    expect(result.data.retentionDays).toBe(30);
    const names = result.data.files.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining(["heel.db", "documents", "pdf"]));
    expect(names).not.toContain("sidecar.json");
    expect(names).not.toContain("sidecar.log");
    expect(result.data.files.find((f) => f.name === "pdf")?.bytes).toBe(6);
    expect(sizeOf("/nowhere")).toBe(0);
  });
});

describe("POST /data/backup", () => {
  it("writes a consistent database copy, data.json and the documents next to each other, and reveals the folder", async () => {
    const { post, dataDir } = dataFolder();
    const result = backup.parse(await post("/data/backup"));
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.path.startsWith(join(dataDir, "Desktop", "heel-backup-"))).toBe(true);
    const copy = new DatabaseSync(join(result.data.path, "heel.db"), { readOnly: true });
    expect(copy.prepare("SELECT COUNT(*) AS n FROM tasks").get()).toEqual({ n: 2 });
    copy.close();
    const data = JSON.parse(readFileSync(join(result.data.path, "data.json"), "utf8"));
    expect(data.tasks).toHaveLength(2);
    expect(data.parked).toHaveLength(1);
    expect(data.messages).toHaveLength(1);
    expect(readdirSync(join(result.data.path, "documents"))).toHaveLength(1);
    expect(backupFolderName(new Date("2026-10-27T09:05:03.000Z"))).toBe("heel-backup-2026-10-27-09-05-03");
  });
});

describe("POST /data/wipe", () => {
  it("refuses anything but the exact phrase", async () => {
    const { post, store } = dataFolder();
    expect(await post("/data/wipe", { confirm: "wipe" })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(await post("/data/wipe", { confirm: "Wipe everything" })).toMatchObject({ ok: false });
    expect(store.tasks.list().length).toBe(2);
  });

  it("empties every table, removes the folder's entries but the shell's files, and the store keeps working", async () => {
    const { post, json, store, dataDir } = dataFolder();
    const result = wiped.parse(await post("/data/wipe", { confirm: "wipe everything" }));
    expect(result).toEqual({ ok: true, data: { rows: 5, files: 2 } });
    const after = preview.parse(await json("/data/preview"));
    expect(after.ok && after.data.counts).toEqual({ tasks: 0, parked: 0, messages: 0, documents: 0, skills: 0 });
    expect(existsSync(join(dataDir, "documents"))).toBe(false);
    expect(existsSync(join(dataDir, "pdf"))).toBe(false);
    expect(existsSync(join(dataDir, "sidecar.json"))).toBe(true);
    expect(existsSync(join(dataDir, "sidecar.log"))).toBe(true);
    expect(store.schemaVersion()).toBeGreaterThan(0);
    expect(store.tasks.add({ title: "fresh" }).ok).toBe(true);
    expect(store.settings.getBrain()).toEqual({ provider: null, model: null });
  });
});
