import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
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
  it("rejects paths and unsupported/empty uploads before writing a file", () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-upload-test-"));
    for (const input of [{ name: "../cv.pdf", base64: "eA==" }, { name: "cv.exe", base64: "eA==" }, { name: "cv.pdf", base64: "" }, { name: "cv.txt", base64: "not base64" }]) expect(() => uploadAttachment(dir, input)).toThrow();
  });
});
