import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DebugExportResultSchema, DebugInfoSchema, envelope } from "../../shared/api";
import { APP_VERSION } from "../../shared/version";
import { SIDECAR_LOG_FILE, reportFileName, tailLines } from "./debug-routes";
import { setup } from "./test-app";

const info = envelope(DebugInfoSchema);
const exported = envelope(DebugExportResultSchema);

describe("GET /debug", () => {
  it("answers with every fact and the last 200 lines of the helper log", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "heel-debug-"));
    writeFileSync(join(dataDir, SIDECAR_LOG_FILE), Array.from({ length: 250 }, (_, i) => `line ${i + 1}`).join("\n") + "\n");
    const { store, json } = setup({}, {}, undefined, undefined, { dataDir });
    store.tasks.add({ title: "one" });
    store.parked.park({ idea: "later" });
    const result = info.parse(await json("/debug"));
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data).toMatchObject({ version: APP_VERSION, port: 5555, dataDir, provider: null, attention: false, counts: { tasks: 1, parked: 1, documents: 0 } });
    expect(result.data.node).toMatch(/^v\d+/);
    expect(result.data.migration).toBeGreaterThan(0);
    expect(result.data.sidecarLog).toHaveLength(200);
    expect(result.data.sidecarLog.at(-1)).toBe("line 250");
  });

  it("gives an empty tail when sidecar.log is missing, and never throws", async () => {
    const result = info.parse(await setup().json("/debug"));
    expect(result.ok && result.data.sidecarLog).toEqual([]);
    expect(tailLines("/nowhere/at/all.log")).toEqual([]);
  });
});

describe("POST /debug/export", () => {
  it("writes the text to a dated file in the export folder and reveals it", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "heel-debug-"));
    const revealed: [string, boolean][] = [];
    const { post } = setup({}, {}, undefined, undefined, { dataDir, openFile: async (path, reveal) => (revealed.push([path, reveal]), true) });
    const result = exported.parse(await post("/debug/export", { text: "Heel 0.1.0 · report" }));
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.path.startsWith(join(dataDir, "Desktop", "heel-report-"))).toBe(true);
    expect(result.data.path.endsWith(".txt")).toBe(true);
    expect(readFileSync(result.data.path, "utf8")).toBe("Heel 0.1.0 · report");
    expect(revealed).toEqual([[result.data.path, true]]);
    expect(await post("/debug/export", { text: "" })).toMatchObject({ ok: false, error: { code: "invalid" } });
  });

  it("names the file by the moment, safe for any file system", () => {
    expect(reportFileName(new Date("2026-10-27T09:05:03.000Z"))).toBe("heel-report-2026-10-27-09-05-03.txt");
  });
});
