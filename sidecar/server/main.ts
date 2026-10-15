import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { createProviders } from "../agent/providers/registry";
import { openStore } from "../store/store";
import { createApp, DEV_ORIGIN, TAURI_ORIGINS } from "./app";
import { removeConnectionFile, writeConnectionFile } from "./connection-file";
import { dataDir } from "./data-dir";

const HOST = "127.0.0.1";
const TOKEN_BYTES = 32;
const DB_FILE = "heel.db";

const dir = dataDir();
mkdirSync(dir, { recursive: true, mode: 0o700 });

const store = openStore({ path: join(dir, DB_FILE) });
const token = randomBytes(TOKEN_BYTES).toString("hex");
const app = createApp({ store, providers: createProviders(), token, allowedOrigins: [DEV_ORIGIN, ...TAURI_ORIGINS] });

// Port 0 = let the OS pick a free port; the panel finds it in the connection file.
const server = serve({ fetch: app.fetch, hostname: HOST, port: 0 }, (info) => {
  writeConnectionFile(dir, { port: info.port, token });
  console.log(`Heel sidecar listening on ${HOST}:${info.port} (data: ${dir})`);
});

let stopping = false;
function shutdown(): void {
  if (stopping) return;
  stopping = true;
  removeConnectionFile(dir);
  server.close();
  store.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
