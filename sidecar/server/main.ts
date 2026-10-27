import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { createProviders } from "../agent/providers/registry";
import { runCommand } from "../agent/providers/process";
import { macKeychain } from "../inbox/keychain";
import { openUrl } from "../inbox/open-url";
import { createInbox } from "../inbox/service";
import { appleApps } from "../apps/source";
import { CALENDAR_TIMEOUT_MS, osascriptJxa } from "../mail/jxa";
import { appleMail } from "../mail/source";
import { mailAppExists } from "../mail/available";
import { BUNDLED_SKILLS } from "../agent/bundled-skills";
import { SKILLS_DIR } from "../agent/prompt";
import { createSkillsService } from "../agent/skills";
import { createPdfRenderer } from "../pdf/renderer";
import { openStore } from "../store/store";
import { createApp, DEV_ORIGIN, TAURI_ORIGINS } from "./app";
import { findRunningHelper, removeConnectionFile, writeConnectionFile } from "./connection-file";
import { dataDir } from "./data-dir";

const HOST = "127.0.0.1";
const TOKEN_BYTES = 32;
const DB_FILE = "heel.db";

const dir = dataDir();
mkdirSync(dir, { recursive: true, mode: 0o700 });

// One helper per data dir: a second one would fight over the database and the connection file.
const running = await findRunningHelper(dir);
if (running) {
  console.log(`Heel's helper is already running on port ${running.port}. Not starting a second one.`);
  process.exit(0);
}

const DOCUMENTS_DIR = "documents";
const store = openStore({ path: join(dir, DB_FILE), documentsDir: join(dir, DOCUMENTS_DIR) });
/** macOS `open`: the file in its default app, or revealed in Finder. */
const OPEN_TIMEOUT_MS = 10_000;
const openFile = async (path: string, reveal: boolean): Promise<boolean> => (await runCommand("open", reveal ? ["-R", path] : [path], { timeoutMs: OPEN_TIMEOUT_MS })).ok;
const token = randomBytes(TOKEN_BYTES).toString("hex");
const inbox = createInbox({ fetch, secrets: macKeychain(runCommand), now: Date.now, openUrl });
const mail = appleMail(osascriptJxa(runCommand), runCommand);
const apps = appleApps((app) => osascriptJxa(runCommand, app, app === "Calendar" ? CALENDAR_TIMEOUT_MS : undefined));
const pdf = createPdfRenderer({ run: runCommand, dir: join(dir, "pdf") });
const skills = createSkillsService({ bundledDir: SKILLS_DIR, bundled: BUNDLED_SKILLS, userDir: join(dir, "skills"), off: store.settings.getSkillsOff, setOff: store.settings.setSkillsOff });
const app = createApp({ store, providers: createProviders(), inbox, mail, mailAvailable: mailAppExists(), apps, token, allowedOrigins: [DEV_ORIGIN, ...TAURI_ORIGINS, ...(process.env.HEEL_DEV_ORIGIN ? [process.env.HEEL_DEV_ORIGIN] : [])], openFile, renderPdf: pdf.render, skills });

// Port 0 = let the OS pick a free port; the panel finds it in the connection file.
const server = serve({ fetch: app.fetch, hostname: HOST, port: 0 }, (info) => {
  writeConnectionFile(dir, { port: info.port, token });
  console.log(`Heel sidecar listening on ${HOST}:${info.port} (data: ${dir})`);
});

let stopping = false;
function shutdown(): void {
  if (stopping) return;
  stopping = true;
  removeConnectionFile(dir, token);
  server.close();
  store.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
