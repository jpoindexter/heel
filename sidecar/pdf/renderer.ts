import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RunCommand } from "../agent/providers/process";
import { HTML2PDF_SOURCE, HTML2PDF_VERSION } from "./html2pdf-source";

export type RenderError = { code: "no_tools" | "compile" | "render"; message: string };
export type RenderResult = { ok: true; path: string } | { ok: false; error: RenderError };

const COMPILE_TIMEOUT_MS = 120_000;
const RENDER_TIMEOUT_MS = 45_000;
export const NO_TOOLS_MESSAGE = "Making a PDF needs Apple's command line tools. In Terminal: xcode-select --install, then try again.";

type Deps = { run: RunCommand; /** Where the compiled printer and its scratch HTML live (inside the app data folder). */ dir: string; swiftc?: string };

/** Compiles the WebKit printer once (named by version, so an update compiles again), then renders each page through it. */
export function createPdfRenderer({ run, dir, swiftc = "/usr/bin/swiftc" }: Deps) {
  const binary = join(dir, `html2pdf-v${HTML2PDF_VERSION}`);

  const ensureBinary = async (): Promise<RenderError | null> => {
    if (existsSync(binary)) return null;
    if (!existsSync(swiftc)) return { code: "no_tools", message: NO_TOOLS_MESSAGE };
    mkdirSync(dir, { recursive: true });
    const source = join(dir, "html2pdf.swift");
    writeFileSync(source, HTML2PDF_SOURCE, "utf8");
    const compiled = await run(swiftc, ["-O", source, "-o", binary], { timeoutMs: COMPILE_TIMEOUT_MS });
    if (!compiled.ok) return { code: "compile", message: `Couldn't build the PDF printer: ${compiled.message.slice(0, 200)}` };
    return existsSync(binary) ? null : { code: "compile", message: "The PDF printer did not come out of the build." };
  };

  const render = async (html: string, outPath: string): Promise<RenderResult> => {
    const missing = await ensureBinary();
    if (missing) return { ok: false, error: missing };
    mkdirSync(dir, { recursive: true });
    const page = join(dir, `page-${process.pid}-${Date.now()}.html`);
    writeFileSync(page, html, "utf8");
    const ran = await run(binary, [page, outPath], { timeoutMs: RENDER_TIMEOUT_MS });
    rmSync(page, { force: true });
    if (!ran.ok) return { ok: false, error: { code: "render", message: `Couldn't render the PDF: ${(ran.stdout || ran.message).trim().slice(0, 200)}` } };
    return existsSync(outPath) ? { ok: true, path: outPath } : { ok: false, error: { code: "render", message: "The PDF was not written." } };
  };

  return { render, binary };
}

export type PdfRenderer = ReturnType<typeof createPdfRenderer>;
