import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { MAX_ATTACHMENT_BYTES, type ApplicationView, type Attachment } from "../../shared/applications";
import { digest } from "./network";

export function saveApplication(dir: string, view: ApplicationView) {
  mkdirSync(join(dir, "records"), { recursive: true, mode: 0o700 });
  const text = JSON.stringify(view);
  writeFileSync(join(dir, "current.tmp"), text, { mode: 0o600 });
  renameSync(join(dir, "current.tmp"), join(dir, "current.json"));
  writeFileSync(join(dir, "records", `${view.id}.json`), text, { mode: 0o600 });
}

export function uploadAttachment(dir: string, input: { name: string; base64: string }): Attachment {
  if (basename(input.name) !== input.name || ![".pdf", ".doc", ".docx", ".txt"].includes(extname(input.name).toLowerCase())) throw new Error("Choose a PDF, DOC, DOCX or TXT attachment.");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.base64)) throw new Error("The attachment could not be read. Choose it again.");
  const buffer = Buffer.from(input.base64, "base64");
  if (!buffer.length || buffer.length > MAX_ATTACHMENT_BYTES) throw new Error("Choose a non-empty attachment up to 5 MB.");
  const attachment = { id: randomUUID(), name: input.name, bytes: buffer.length, sha256: digest(buffer) };
  mkdirSync(join(dir, "attachments"), { recursive: true, mode: 0o700 });
  writeFileSync(join(dir, "attachments", attachment.id), buffer, { mode: 0o600 });
  return attachment;
}

export function attachmentFile(dir: string, attachment: Attachment) {
  const path = join(dir, "attachments", attachment.id);
  if (digest(readFileSync(path)) !== attachment.sha256) throw new Error("That attachment changed. Choose it again before submitting.");
  // Playwright's file payload preserves the original filename without trusting a supplied filesystem path.
  const mime: Record<string, string> = { ".pdf": "application/pdf", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".txt": "text/plain" };
  return { name: attachment.name, mimeType: mime[extname(attachment.name).toLowerCase()] ?? "application/octet-stream", buffer: readFileSync(path) };
}
