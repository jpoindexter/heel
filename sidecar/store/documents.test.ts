import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fileNameFor, fileText } from "./documents";
import { testStore } from "./test-helpers";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe("documents", () => {
  it("names the file from the title and a piece of the id, safely", () => {
    expect(fileNameFor("Research: Tauri window levels!", "abcdef12-3456")).toBe("research-tauri-window-levels-abcdef12.md");
    expect(fileNameFor("   ", "abcdef12-3456")).toBe("document-abcdef12.md");
    expect(fileNameFor("x".repeat(80), "id")).toMatch(/^x{48}-id\.md$/);
    expect(fileText("T", "body")).toBe("# T\n\nbody\n");
  });

  it("writes the file when a folder is known, lists newest first, hides on delete and comes back on restore", () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-docs-"));
    dirs.push(dir);
    const store = testStore({ documentsDir: dir });
    const first = store.documents.create({ title: "Window levels", body: "## Findings\n- one\n\n## Sources\n- https://example.com" });
    if (!first.ok) throw new Error(first.error.message);
    expect(readFileSync(first.value.path!, "utf8")).toBe("# Window levels\n\n## Findings\n- one\n\n## Sources\n- https://example.com\n");
    store.documents.create({ title: "Second", body: "b" });
    expect(store.documents.list().map((d) => d.title)).toEqual(["Second", "Window levels"]);
    expect(store.documents.remove(first.value.id).ok).toBe(true);
    expect(store.documents.list().map((d) => d.title)).toEqual(["Second"]);
    expect(readFileSync(first.value.path!, "utf8")).toContain("Window levels");
    expect(store.documents.restore(first.value.id).ok).toBe(true);
    expect(store.documents.list()).toHaveLength(2);
    expect(store.documents.body(first.value.id)).toContain("## Sources");
  });

  it("keeps rows only without a folder, and refuses an empty title or body", () => {
    const store = testStore();
    const doc = store.documents.create({ title: "Notes", body: "x" });
    expect(doc.ok && doc.value.path).toBeNull();
    expect(store.documents.create({ title: "", body: "x" })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(store.documents.create({ title: "T", body: " " })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(store.documents.remove("nope")).toMatchObject({ ok: false, error: { code: "not_found" } });
  });
});
