// Bundles the helper (sidecar) into src-tauri/resources/sidecar so the packaged app can start it with the user's Node.
// Run by `npm run bundle:sidecar` (and by the Tauri build). Output is generated and gitignored.
import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "./build-cv-reader.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "src-tauri", "resources", "sidecar");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: [join(root, "sidecar", "server", "main.ts")],
  outfile: join(out, "sidecar.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  // node:sqlite and the other node: modules are built in; everything else (hono, zod) is bundled in.
  external: ["playwright-core"],
  legalComments: "none",
  logLevel: "info",
});

await cp(join(root, "skills", "nd-skills"), join(out, "skills", "nd-skills"), { recursive: true });
await cp(join(root, "node_modules", "playwright-core"), join(out, "node_modules", "playwright-core"), { recursive: true });
console.log(`sidecar bundled → ${out}`);
