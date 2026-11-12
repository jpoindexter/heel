import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { UpdateManifestSchema } from "../feedback-service/updates";

const root = resolve(import.meta.dirname, ".."), bundle = join(root, "src-tauri/target/release/bundle");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version as string;
const notes = process.argv[2];
assert(notes, "Usage: npx tsx scripts/publish-release.ts RELEASE_NOTES_FILE");
const manifest = UpdateManifestSchema.parse(JSON.parse(readFileSync(join(bundle, "macos/latest.json"), "utf8")));
assert.equal(manifest.version, version);
const assets = [join(bundle, `dmg/Heel_${version}_aarch64.dmg`), ...["Heel.app.tar.gz", "Heel.app.tar.gz.sig", "latest.json"].map(name => join(bundle, "macos", name))];
for (const asset of assets) assert(statSync(asset).size > 0, `Missing asset: ${asset}`);
const gh = (...args: string[]) => execFileSync("gh", args, { cwd: root, stdio: "inherit" });
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
// Draft uploads keep the feed from ever selecting a partly uploaded release.
gh("release", "create", `v${version}`, ...assets, "--repo", "jpoindexter/heel", "--target", sha, "--draft", "--prerelease", "--title", `Heel ${version}`, "--notes-file", resolve(notes));
gh("release", "edit", `v${version}`, "--repo", "jpoindexter/heel", "--draft=false");
const body = join(mkdtempSync(join(tmpdir(), "heel-update-publish-")), "query.json");
writeFileSync(body, JSON.stringify({ sql: "INSERT INTO update_feed(id, payload) VALUES ('latest', ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload", params: [JSON.stringify(manifest)] }));
execFileSync(join(root, "feedback-service/node_modules/.bin/cf"), ["d1", "raw", "cef5f543-249d-404e-ae17-83d31e0c97eb", "--body", `@${body}`], { cwd: join(root, "feedback-service"), stdio: "inherit" });
console.log(`Published Heel ${version} and its signed update feed.`);
