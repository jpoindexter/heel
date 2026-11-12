import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { uploadAttachment, attachmentFile } from "./files";
import { cvText } from "./cv-text";

function syntheticPdf(text: string) {
  const stream = `BT /F1 12 Tf 50 760 Td (${text}) Tj ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(pdf);
}

describe("local CV handling", () => {
  it("extracts a real PDF locally and preserves the correct upload MIME and bytes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-cv-test-"));
    const bytes = syntheticPdf("Iris Synthetic Researcher");
    const attachment = uploadAttachment(dir, { name: "cv.pdf", base64: bytes.toString("base64") });
    expect(await cvText(dir, attachment)).toContain("Iris Synthetic Researcher");
    expect(attachmentFile(dir, attachment).mimeType).toBe("application/pdf");
    expect(attachmentFile(dir, attachment).buffer).toEqual(bytes);
    writeFileSync(join(dir, "attachments", attachment.id), "tampered");
    expect(() => attachmentFile(dir, attachment)).toThrow("changed");
  }, 70_000);
  it("reads a text PDF when Apple's developer tools are unavailable", async () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-cv-no-toolchain-"));
    const attachment = uploadAttachment(dir, { name: "cv.pdf", base64: syntheticPdf("Iris Without Developer Tools").toString("base64") });
    vi.stubEnv("DEVELOPER_DIR", join(dir, "no-developer-tools"));
    try { expect(await cvText(dir, attachment)).toContain("Iris Without Developer Tools"); }
    finally { vi.unstubAllEnvs(); }
  });
  it.each(["scanned.pdf", "mixed.pdf"])("reads %s locally without developer tools", async name => {
    const dir = mkdtempSync(join(tmpdir(), "heel-cv-ocr-"));
    const bytes = readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
    const attachment = uploadAttachment(dir, { name, base64: bytes.toString("base64") });
    vi.stubEnv("DEVELOPER_DIR", join(dir, "no-developer-tools"));
    try {
      const text = await cvText(dir, attachment);
      expect(text).toContain("Iris Synthetic Researcher");
      expect(text).toContain("iris@example.test");
      expect(text).toContain("Research experience in Spain");
      expect(text).toContain("Expérience en recherche");
      if (name === "mixed.pdf") expect(text.indexOf("Native page before scanned CV")).toBeLessThan(text.indexOf("Research experience in Spain"));
      expect(attachmentFile(dir, attachment).buffer).toEqual(bytes);
    } finally { vi.unstubAllEnvs(); }
  }, 50_000);
  it.each(["blank.pdf", "locked.pdf", "too-many.pdf"])("rejects unreadable %s with an actionable error", async name => {
    const dir = mkdtempSync(join(tmpdir(), "heel-cv-unreadable-"));
    const attachment = uploadAttachment(dir, { name, base64: readFileSync(new URL(`./fixtures/${name}`, import.meta.url)).toString("base64") });
    await expect(cvText(dir, attachment)).rejects.toThrow("Heel could not read this CV");
  }, 50_000);
  it("rejects paths and unsupported/empty uploads before writing a file", () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-upload-test-"));
    for (const input of [{ name: "../cv.pdf", base64: "eA==" }, { name: "cv.exe", base64: "eA==" }, { name: "cv.pdf", base64: "" }, { name: "cv.txt", base64: "not base64" }]) expect(() => uploadAttachment(dir, input)).toThrow();
  });
});
