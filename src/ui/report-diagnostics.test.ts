import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "../api/client";
import { reportDiagnostics } from "./report-diagnostics";

afterEach(() => vi.unstubAllGlobals());
describe("sendable diagnostics", () => {
  it("excludes private paths, raw errors and helper logs by construction", async () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => JSON.stringify([{ at: 1, where: "panel", level: "error", text: "uncaught error: PRIVATE CV TEXT and sk-private-token" }]) } });
    const client = createClient({ readInfo: async () => ({ port: 5555, token: "test-token-0123456789abcdef" }), fetch: async () => Response.json({ ok: true, data: { version: "0.1.4", os: "macOS", node: "v22", port: 5555, uptimeSec: 1, dataDir: "/Users/private-person/private-folder", migration: 6, provider: null, attention: false, counts: { tasks: 1, parked: 0, documents: 1 }, sidecarLog: ["PRIVATE MAIL TEXT"] } }) });
    const result = JSON.stringify(await reportDiagnostics(client, true));
    expect(result).not.toMatch(/PRIVATE|private-person|private-folder|sk-private/);
    expect(result).toContain('"event":"error"');
    expect(result).toContain('"crashed":true');
  });
});
