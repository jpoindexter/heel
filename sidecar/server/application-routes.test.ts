import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Applications } from "../applications/service";
import { parseAgentReply } from "../agent/actions";
import { setup } from "./test-app";

describe("application API boundaries", () => {
  it("requires the helper token and validates approval input before acting", async () => {
    const applications = new Applications({ dir: mkdtempSync(join(tmpdir(), "heel-api-test-")) });
    const test = setup({}, {}, undefined, undefined, { applications });
    try {
      const response = await test.call("/applications/approve", { method: "POST", headers: { "x-heel-token": "wrong" }, body: '{}' });
      expect(response.status).toBe(401);
      expect(await test.post("/applications/approve", { request: "x" })).toMatchObject({ ok: false, error: { code: "invalid" } });
      expect(await test.post("/applications/open", { url: "file:///etc/passwd" })).toMatchObject({ ok: false });
    } finally { test.store.close(); await applications.close(); }
  });
  it("keeps cancel reachable while a browser/model action owns the lock", async () => {
    const applications = new Applications({ dir: mkdtempSync(join(tmpdir(), "heel-cancel-test-")) });
    const test = setup({}, {}, undefined, undefined, { applications });
    let release: () => void = () => {};
    const work = applications.exclusive(() => new Promise<void>(resolve => { release = resolve; }));
    try { expect(await test.post("/applications/cancel")).toMatchObject({ ok: true, data: { application: null } }); }
    finally { release(); await work; test.store.close(); await applications.close(); }
  });
  it("lets chat prepare a job but cannot create a submit/approval action", () => {
    expect(parseAgentReply(JSON.stringify({ say: "Review the application.", actions: [{ type: "prepare_application", url: "https://example.com/job" }] }))).toMatchObject({ ok: true });
    for (const type of ["submit_application", "approve_application", "browser_click"]) expect(parseAgentReply(JSON.stringify({ say: "Submitted", actions: [{ type }] })).ok).toBe(false);
  });
});
