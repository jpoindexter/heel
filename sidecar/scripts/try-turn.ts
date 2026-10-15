/**
 * Run one real agent turn against a real provider and print what happened.
 *   npx tsx sidecar/scripts/try-turn.ts <claude|codex|ollama> [--model <name>] "what the person says"
 * Uses a throwaway database; nothing here touches the app's data.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProviders, detectAll } from "../agent/providers/registry";
import { runTurn } from "../agent/turn";
import { PROVIDER_IDS, type ProviderId } from "../store/settings";
import { openStore } from "../store/store";

function usage(): never {
  console.error('Usage: npx tsx sidecar/scripts/try-turn.ts <claude|codex|ollama> [--model <name>] "message"');
  process.exit(2);
}

const args = process.argv.slice(2);
const providerId = args.shift() as ProviderId | undefined;
if (!providerId || !PROVIDER_IDS.includes(providerId)) usage();
let model: string | null = null;
if (args[0] === "--model") {
  args.shift();
  model = args.shift() ?? null;
}
const message = args.join(" ").trim();
if (!message) usage();

const dir = mkdtempSync(join(tmpdir(), "heel-try-"));
const store = openStore({ path: join(dir, "try.db") });
const providers = createProviders();

try {
  console.log("Providers:");
  for (const status of await detectAll(providers)) {
    console.log(`  ${status.id.padEnd(7)} ${status.ready ? "ready" : "not ready"}  ${status.detail}`);
  }

  const started = Date.now();
  const result = await runTurn({ store, provider: providers[providerId], model }, message);
  console.log(`\nTurn via ${providerId}${model ? ` (${model})` : ""} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(JSON.stringify(result, null, 2));
  console.log("\nTasks:", JSON.stringify(store.tasks.list().map((t) => ({ title: t.title, nowStep: t.nowStep, source: t.source })), null, 2));
  console.log("Parked:", JSON.stringify(store.parked.list().map((p) => p.idea)));
  console.log("Focus:", JSON.stringify(store.focus.active()?.goal ?? null));
  process.exitCode = result.ok ? 0 : 1;
} finally {
  store.close();
  rmSync(dir, { recursive: true, force: true });
}
