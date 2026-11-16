// Build-time only: testers receive this native executable inside the signed app.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") throw new Error("Heel's PDF/OCR reader requires a macOS build host.");
const triple = process.env.TAURI_ENV_TARGET_TRIPLE ?? `${process.arch === "arm64" ? "aarch64" : "x86_64"}-apple-darwin`;
if (!["aarch64-apple-darwin", "x86_64-apple-darwin"].includes(triple)) throw new Error(`Unsupported native reader target: ${triple}`);
const folder = fileURLToPath(new URL("../src-tauri/binaries/", import.meta.url));
mkdirSync(folder, { recursive: true });
const sourceDir = mkdtempSync(join(tmpdir(), "heel-native-source-"));
const main = join(sourceDir, "main.swift");
writeFileSync(main, readFileSync(new URL("../sidecar/applications/cv-text.swift", import.meta.url)));
const result = spawnSync("/usr/bin/swiftc", ["-O", "-target", `${triple.startsWith("aarch64") ? "arm64" : "x86_64"}-apple-macosx11.0`, main, fileURLToPath(new URL("../sidecar/photos/photo.swift", import.meta.url)), "-o", `${folder}heel-cv-text-${triple}`], { stdio: "inherit" });
rmSync(sourceDir, { recursive: true, force: true });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
