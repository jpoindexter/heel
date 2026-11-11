import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CompleteRequest } from "./types";

export function imageDataUrl(image: NonNullable<CompleteRequest["image"]>) { return `data:${image.mimeType};base64,${image.data}`; }
export function anthropicContent(request: CompleteRequest) {
  return request.image ? [{ type: "image", source: { type: "base64", media_type: request.image.mimeType, data: request.image.data } }, { type: "text", text: request.prompt }] : request.prompt;
}
export function imageFile(request: CompleteRequest) {
  if (!request.image) return { args: [] as string[], close: () => {} };
  const dir = mkdtempSync(join(tmpdir(), "heel-vision-")), file = join(dir, "page.png");
  writeFileSync(file, Buffer.from(request.image.data, "base64"), { mode: 0o600 });
  return { args: ["--image", file], close: () => rmSync(dir, { recursive: true, force: true }) };
}
