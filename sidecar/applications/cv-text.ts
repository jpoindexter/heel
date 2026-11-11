import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { runCommand } from "../agent/providers/process";

const PDF_SOURCE = `import PDFKit
let args = CommandLine.arguments
guard args.count == 2, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])), !doc.isLocked else { exit(1) }
guard doc.pageCount <= 50 else { exit(2) }
var text = ""
for index in 0..<doc.pageCount { text += (doc.page(at: index)?.string ?? "") + "\\n"; if text.count > 20000 { break } }
print(String(text.prefix(20000)))
`;

/** Local extraction follows Heel's existing compile-once PDF renderer; no CV bytes go to an AI here. */
export async function cvText(dir: string, attachment: { id: string; name: string }): Promise<string> {
  const path = join(dir, "attachments", attachment.id), ext = extname(attachment.name).toLowerCase();
  if (ext === ".txt") return readFileSync(path, "utf8").slice(0, 20_000);
  let executable = "/usr/bin/textutil", args = ["-convert", "txt", "-stdout", "-format", ext.slice(1), path];
  if (ext === ".pdf") {
    executable = join(dir, "cvtext-v1"); args = [path];
    if (!existsSync(executable)) {
      const source = join(dir, "cvtext.swift");
      writeFileSync(source, PDF_SOURCE, { mode: 0o600 });
      const compiled = await runCommand("/usr/bin/swiftc", [source, "-o", executable], { timeoutMs: 60_000 });
      if (!compiled.ok) throw new Error("Reading PDF text needs Apple's command line tools. Paste your CV text into Applicant facts instead.");
    }
  }
  const result = await runCommand(executable, args, { timeoutMs: 15_000 });
  const text = result.stdout.trim().slice(0, 20_000);
  if (!result.ok || !text) throw new Error("Heel could not extract text from this CV. For a scanned, encrypted or unsupported document, paste the facts yourself.");
  return text;
}
