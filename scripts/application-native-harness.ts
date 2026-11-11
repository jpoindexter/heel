import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { Applications } from "../sidecar/applications/service";
import { applicationFixture } from "../sidecar/applications/test-fixture";
import { codexProvider } from "../sidecar/agent/providers/codex";
import { defaultDeps } from "../sidecar/agent/providers/registry";
import { setup, TOKEN } from "../sidecar/server/test-app";
import { writeConnectionFile, removeConnectionFile } from "../sidecar/server/connection-file";

// Only the separately compiled native-proof bundle reads this connection file.
const dir = join(homedir(), "Library/Application Support/studio.theft.heel.native-proof");
mkdirSync(dir, { recursive: true });
const fixture = await applicationFixture();
const applications = new Applications({ dir: join(dir, "applications"), headless: true, testOrigins: [fixture.url] });
const test = setup({ codex: codexProvider(defaultDeps()) }, {}, undefined, undefined, { applications, allowedOrigins: ["tauri://localhost", "http://tauri.localhost"], dataDir: dir });
test.store.settings.setBrain({ provider: "codex", model: null });
const server = serve({ fetch: test.app.fetch, hostname: "127.0.0.1", port: 0 });
await new Promise<void>(resolve => server.listening ? resolve() : server.once("listening", resolve));
writeConnectionFile(dir, { port: (server.address() as AddressInfo).port, token: TOKEN });
writeFileSync(join(dir, "iris-native-cv.txt"), "Iris Corrected\nSynthetic research CV. Not a real application.\n");
console.log(JSON.stringify({ nativeDataDir: dir, applicationUrl: `${fixture.url}/job` }));
const timer = setInterval(async () => {
  const view = await applications.refresh().catch(() => null);
  const submitted = fixture.received.filter(r => r.path === "/submit");
  assert.ok(submitted.length <= 1, "No duplicate submission");
  writeFileSync(join(dir, "native-observation.json"), JSON.stringify({ date: new Date().toISOString(), received: fixture.received, application: view?.application }, null, 2));
}, 1500);
process.on("SIGTERM", async () => {
  clearInterval(timer);
  await applications.close();
  removeConnectionFile(dir, TOKEN);
  server.closeAllConnections(); server.close();
  await fixture.close(); test.store.close();
  process.exit(0);
});
