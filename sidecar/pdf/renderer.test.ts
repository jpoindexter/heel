import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { RunCommand } from "../agent/providers/process";
import { createPdfRenderer } from "./renderer";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

/** A run that pretends to be swiftc (writes the binary) and the binary (writes the pdf), remembering what it was asked. */
function fakeRun(calls: string[][]): RunCommand {
  return async (executable, args) => {
    calls.push([executable, ...args]);
    if (executable.endsWith("swiftc")) writeFileSync(args[3]!, "binary");
    else writeFileSync(args[1]!, "%PDF-1.3 fake");
    return { ok: true, stdout: "ok 12", stderr: "" };
  };
}

describe("the PDF renderer", () => {
  it("compiles the printer once, then renders through it", async () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-pdf-"));
    dirs.push(dir);
    const calls: string[][] = [];
    const swiftc = join(dir, "swiftc");
    writeFileSync(swiftc, "");
    const renderer = createPdfRenderer({ run: fakeRun(calls), dir, swiftc });
    const first = await renderer.render("<p>a</p>", join(dir, "a.pdf"));
    const second = await renderer.render("<p>b</p>", join(dir, "b.pdf"));
    expect(first).toEqual({ ok: true, path: join(dir, "a.pdf") });
    expect(second.ok).toBe(true);
    expect(calls.map((c) => c[0])).toEqual([swiftc, renderer.binary, renderer.binary]);
    expect(existsSync(join(dir, "html2pdf.swift"))).toBe(true);
  });

  it("says what to install when swiftc is missing, and reports a failed render in a sentence", async () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-pdf-"));
    dirs.push(dir);
    const none = createPdfRenderer({ run: fakeRun([]), dir, swiftc: join(dir, "nope") });
    expect(await none.render("<p>a</p>", join(dir, "a.pdf"))).toMatchObject({ ok: false, error: { code: "no_tools" } });
    const swiftc = join(dir, "swiftc");
    writeFileSync(swiftc, "");
    const failing: RunCommand = async (executable, args) => {
      if (executable.endsWith("swiftc")) return (writeFileSync(args[3]!, "binary"), { ok: true, stdout: "", stderr: "" });
      return { ok: false, kind: "exit", message: "exit 1", stdout: "render failed: boom", stderr: "" };
    };
    expect(await createPdfRenderer({ run: failing, dir, swiftc }).render("<p>a</p>", join(dir, "a.pdf"))).toMatchObject({ ok: false, error: { code: "render", message: "Couldn't render the PDF: render failed: boom" } });
  });
});
