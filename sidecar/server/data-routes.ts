import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Hono } from "hono";
import { CONNECTION_FILE } from "../../shared/api";
import { WipeInputSchema } from "../../shared/data";
import { APP_VERSION } from "../../shared/version";
import { MESSAGE_RETENTION_DAYS } from "../store/messages";
import { TASK_STATUSES } from "../store/schema";
import type { AppDeps } from "./app";
import { SIDECAR_LOG_FILE } from "./debug-routes";
import { fail, ok, readJson } from "./respond";

/** The helper's own connection file and the shell's log stay through a wipe; the live database is emptied, not deleted. */
const KEPT = new Set([CONNECTION_FILE, SIDECAR_LOG_FILE]);
const DB_PREFIX = "heel.db";
/** Folders copied whole into a backup, next to the database copy. */
const COPIED_DIRS = ["documents", "skills"];

const isWiped = (name: string): boolean => !KEPT.has(name) && !name.startsWith(DB_PREFIX);

/** Bytes of a file, or of everything under a folder. Unreadable entries count as nothing. */
export function sizeOf(path: string): number {
  try {
    const stat = statSync(path);
    if (!stat.isDirectory()) return stat.size;
    return readdirSync(path).reduce((sum, name) => sum + sizeOf(join(path, name)), 0);
  } catch {
    return 0;
  }
}

export const backupFolderName = (now: Date): string => `heel-backup-${now.toISOString().slice(0, 19).replace(/[:T]/g, "-")}`;

/** Privacy & data (N4): what a wipe would remove, a backup folder on the Desktop, and the wipe itself behind a typed phrase. */
export function registerDataRoutes(app: Hono, { store, skills, inbox, debug, openFile }: AppDeps): void {
  const counts = () => ({
    tasks: store.tasks.list(TASK_STATUSES).length,
    parked: store.parked.list(true).length,
    messages: store.messages.list().messages.length,
    documents: store.documents.list().length,
    skills: skills.list().filter((skill) => skill.source === "yours").length,
  });
  const entries = () => readdirSync(debug.dataDir).filter((name) => isWiped(name) || name.startsWith(DB_PREFIX));

  app.get("/data/preview", (c) =>
    ok(c, {
      dataDir: debug.dataDir,
      retentionDays: MESSAGE_RETENTION_DAYS,
      counts: counts(),
      files: entries().map((name) => ({ name, bytes: sizeOf(join(debug.dataDir, name)) })),
    }),
  );

  app.post("/data/backup", async (c) => {
    const dest = join(debug.exportDir, backupFolderName(new Date()));
    try {
      mkdirSync(dest, { recursive: true });
      store.backupTo(join(dest, DB_PREFIX));
      const data = { exportedAt: new Date().toISOString(), version: APP_VERSION, tasks: store.tasks.list(TASK_STATUSES), parked: store.parked.list(true), messages: store.messages.list().messages, documents: store.documents.list() };
      writeFileSync(join(dest, "data.json"), JSON.stringify(data, null, 2), "utf8");
      for (const dir of COPIED_DIRS) if (existsSync(join(debug.dataDir, dir))) cpSync(join(debug.dataDir, dir), join(dest, dir), { recursive: true });
    } catch (error) {
      return fail(c, "conflict", `Couldn't write the backup to ${dest}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return ok(c, { path: dest, revealed: await openFile(dest, true) });
  });

  app.post("/data/wipe", async (c) => {
    const body = WipeInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", `Type "wipe everything" exactly to confirm.`);
    const before = counts();
    const rows = before.tasks + before.parked + before.messages + before.documents + before.skills;
    const files = entries().filter(isWiped);
    store.reset();
    for (const name of files) rmSync(join(debug.dataDir, name), { recursive: true, force: true });
    await inbox.disconnect({ forgetClient: true });
    return ok(c, { rows, files: files.length });
  });
}
