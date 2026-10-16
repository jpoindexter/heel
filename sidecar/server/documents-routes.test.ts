import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DocumentResultSchema, DocumentsListSchema, OpenedSchema, TurnResultSchema, envelope } from "../../shared/api";
import { testStore } from "../store/test-helpers";
import { fakeProvider, setup } from "./test-app";

const list = envelope(DocumentsListSchema);
const one = envelope(DocumentResultSchema);
const opened = envelope(OpenedSchema);
const turn = envelope(TurnResultSchema);
const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe("documents", () => {
  it("a turn's write_document saves a file, the receipt names it, open and reveal call the Mac, delete hides and restore brings it back", async () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-docs-"));
    dirs.push(dir);
    const calls: [string, boolean][] = [];
    const claude = fakeProvider("claude", {}, { ok: true, value: [] }, { ok: true, value: '{"say":"Saved notes.","actions":[{"type":"write_document","title":"Notes: window levels","body":"## Answer\\nUse NSFloatingWindowLevel.\\n\\n## Sources\\n- https://example.com"}]}' });
    const { store, json, post } = setup({ claude }, {}, undefined, testStore({ documentsDir: dir }), { openFile: async (path, reveal) => (calls.push([path, reveal]), true) });
    store.settings.setBrain({ provider: "claude", model: null });
    const answered = turn.parse(await post("/turn", { text: "Look into macOS window levels for Tauri" }));
    if (!answered.ok) throw new Error(answered.error.message);
    expect(answered.data.applied[0]).toMatchObject({ ok: true, message: 'Saved "Notes: window levels" as a document.', undo: { kind: "delete_document" } });
    const id = answered.data.applied[0]!.document!;
    const listed = list.parse(await json("/documents"));
    expect(listed.ok && listed.data.documents.map((d) => d.title)).toEqual(["Notes: window levels"]);
    expect(opened.parse(await post(`/documents/${id}/open`, {}))).toEqual({ ok: true, data: { opened: true } });
    expect(opened.parse(await post(`/documents/${id}/reveal`, {}))).toEqual({ ok: true, data: { opened: true } });
    expect(calls.map(([path, reveal]) => [path.endsWith("notes-window-levels-id1.md"), reveal])).toEqual([[true, false], [true, true]]);
    expect(one.parse(await post(`/documents/${id}/delete`, {}))).toMatchObject({ ok: true });
    expect(list.parse(await json("/documents"))).toMatchObject({ data: { documents: [] } });
    expect(one.parse(await post(`/documents/${id}/restore`, {}))).toMatchObject({ ok: true });
    expect(list.parse(await json("/documents"))).toMatchObject({ data: { documents: [{ id }] } });
  });

  it("says when a document has no file and when it does not exist", async () => {
    const { store, post } = setup();
    const doc = store.documents.create({ title: "Rows only", body: "x" });
    if (!doc.ok) throw new Error(doc.error.message);
    expect(opened.parse(await post(`/documents/${doc.value.id}/open`, {}))).toMatchObject({ ok: false, error: { code: "not_ready" } });
    expect(opened.parse(await post("/documents/nope/open", {}))).toMatchObject({ ok: false, error: { code: "not_found" } });
  });
});

describe("PDF", () => {
  it("makes the PDF next to the .md and opens it, open?file=pdf finds it, and a turn's make_pdf picks the newest document", async () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-docs-"));
    dirs.push(dir);
    const calls: string[] = [];
    const claude = fakeProvider("claude", {}, { ok: true, value: [] }, { ok: true, value: '{"say":"Done.","actions":[{"type":"make_pdf"}]}' });
    const { store, json, post } = setup({ claude }, {}, undefined, testStore({ documentsDir: dir }), { openFile: async (path) => (calls.push(path), true) });
    store.settings.setBrain({ provider: "claude", model: null });
    const doc = store.documents.create({ title: "Notes", body: "## Answer\nx" });
    if (!doc.ok) throw new Error(doc.error.message);
    expect(opened.parse(await post(`/documents/${doc.value.id}/open?file=pdf`, {}))).toMatchObject({ ok: false, error: { code: "not_ready" } });
    const made = one.parse(await post(`/documents/${doc.value.id}/pdf`, {}));
    if (!made.ok) throw new Error(made.error.message);
    expect(made.data.document.pdfPath).toBe(doc.value.path!.replace(/\.md$/, ".pdf"));
    expect(calls).toEqual([made.data.document.pdfPath]);
    calls.length = 0;
    expect(list.parse(await json("/documents"))).toMatchObject({ data: { documents: [{ pdfPath: made.data.document.pdfPath }] } });
    expect(opened.parse(await post(`/documents/${doc.value.id}/open?file=pdf`, {}))).toEqual({ ok: true, data: { opened: true } });
    calls.length = 0;
    const answered = turn.parse(await post("/turn", { text: "make that a PDF" }));
    expect(answered.ok && answered.data.applied[0]).toMatchObject({ ok: true, message: 'Made a PDF of "Notes".', document: doc.value.id, file: "pdf" });
    expect(calls).toEqual([made.data.document.pdfPath]);
  });

  it("says so when there is nothing to print", async () => {
    const claude = fakeProvider("claude", {}, { ok: true, value: [] }, { ok: true, value: '{"say":"Done.","actions":[{"type":"make_pdf"}]}' });
    const { store, post } = setup({ claude });
    store.settings.setBrain({ provider: "claude", model: null });
    const answered = turn.parse(await post("/turn", { text: "make that a PDF" }));
    expect(answered.ok && answered.data.applied[0]).toMatchObject({ ok: false, message: "There is no document to make a PDF of yet." });
  });
});
