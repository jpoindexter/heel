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
