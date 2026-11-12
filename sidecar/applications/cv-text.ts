import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "../agent/providers/process";

/** Text extraction and scan OCR stay on the Mac; no CV bytes go to an AI here. */
export async function cvText(dir: string, attachment: { id: string; name: string }): Promise<string> {
  const path = join(dir, "attachments", attachment.id), ext = extname(attachment.name).toLowerCase();
  if (ext === ".txt") return readFileSync(path, "utf8").slice(0, 20_000);
  let executable = "/usr/bin/textutil", args = ["-convert", "txt", "-stdout", "-format", ext.slice(1), path];
  if (ext === ".pdf") {
    const bundled = import.meta.url.endsWith("/sidecar.mjs");
    const relative = bundled ? "../../../MacOS/heel-cv-text" : `../../src-tauri/binaries/heel-cv-text-${process.arch === "arm64" ? "aarch64" : "x86_64"}-apple-darwin`;
    executable = fileURLToPath(new URL(relative, import.meta.url)); args = [path];
  }
  const result = await runCommand(executable, args, { timeoutMs: ext === ".pdf" ? 45_000 : 15_000 });
  const text = result.stdout.trim().slice(0, 20_000);
  if (!result.ok || !text) throw new Error("Heel could not read this CV. Check that the document is unlocked, has at most 50 pages and contains legible text, or paste the facts yourself.");
  return text;
}
