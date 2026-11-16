import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_PHOTO_BYTES, PhotoAnswerSchema, PhotoImportResultSchema, type PhotoTransform } from "../../shared/photos";
import { runCommand } from "../agent/providers/process";

type Options = PhotoTransform | { operation: "import" | "normalize" | "ocr"; limit?: number };
async function run(data: string, options: Options, signal?: AbortSignal) {
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES || bytes.toString("base64") !== data) throw new Error("Choose a valid photo up to 20 MB.");
  const dir = mkdtempSync(join(tmpdir(), "heel-photo-"));
  try {
    const input = join(dir, "input"), output = join(dir, "output.png"), settings = join(dir, "options.json");
    writeFileSync(input, bytes, { mode: 0o600 }); writeFileSync(settings, JSON.stringify(options), { mode: 0o600 });
    const bundled = import.meta.url.endsWith("/sidecar.mjs");
    const executable = fileURLToPath(new URL(bundled ? "../../../MacOS/heel-cv-text" : `../../src-tauri/binaries/heel-cv-text-${process.arch === "arm64" ? "aarch64" : "x86_64"}-apple-darwin`, import.meta.url));
    const result = await runCommand(executable, ["--photo", input, output, settings], { timeoutMs: options.operation === "remove-background" ? 90_000 : 30_000, signal });
    if (!result.ok) throw new Error(result.kind === "aborted" ? "Stopped." : options.operation === "remove-background" ? "Could not separate the foreground. Try a clearer subject; background removal requires macOS 14 or later." : "Could not process this photo. Check the format, dimensions and crop; try PNG, JPEG, HEIC, WebP or TIFF.");
    const meta: unknown = JSON.parse(result.stdout);
    if (options.operation === "ocr") return { meta, data: "" };
    const outputBytes = readFileSync(output);
    if (outputBytes.length > MAX_PHOTO_BYTES) throw new Error("That result exceeds 20 MB. Choose smaller dimensions.");
    return { meta, data: outputBytes.toString("base64") };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
export async function nativePhoto(data: string, options: Exclude<Options, { operation: "ocr" }>, signal?: AbortSignal) {
  const result = await run(data, options, signal);
  return PhotoImportResultSchema.parse({ ...(result.meta as object), data: result.data, mimeType: "image/png" });
}
export async function nativePhotoText(data: string, signal?: AbortSignal, decode: typeof run = run) {
  // Apple Vision failed once on first native use; OCR is local and safe to retry once.
  try { return PhotoAnswerSchema.parse((await decode(data, { operation: "ocr" }, signal)).meta); }
  catch (error) {
    if (signal?.aborted) throw error;
    return PhotoAnswerSchema.parse((await decode(data, { operation: "ocr" }, signal)).meta);
  }
}
