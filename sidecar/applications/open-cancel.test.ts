import { describe, expect, it, vi } from "vitest";
import { chromium, type BrowserContext } from "playwright-core";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Applications } from "./service";

describe("cancellation during browser launch", () => {
  it("waits for the pending launch to close before a wipe can proceed", async () => {
    let launch: (context: BrowserContext) => void = () => {}, began: () => void = () => {};
    const started = new Promise<void>(resolve => { began = resolve; });
    const pending = new Promise<BrowserContext>(resolve => { launch = resolve; });
    const context = { close: vi.fn(async () => {}), setDefaultTimeout: () => {}, routeWebSocket: async () => {}, route: async () => {}, pages: () => [] } as unknown as BrowserContext;
    const spy = vi.spyOn(chromium, "launchPersistentContext").mockImplementation(async () => { began(); return pending; });
    const app = new Applications({ dir: mkdtempSync(join(tmpdir(), "heel-opening-cancel-")), testOrigins: ["https://fixture.test"] });
    const opening = app.open({ url: "https://fixture.test/job", facts: "" });
    void opening.catch(() => {});
    try {
      await started;
      let finished = false;
      const forgetting = app.forget().then(() => { finished = true; });
      await new Promise(resolve => setTimeout(resolve, 10));
      const finishedBeforeLaunch = finished;
      launch(context); await forgetting;
      expect(finishedBeforeLaunch).toBe(false);
      await expect(opening).rejects.toThrow("cancelled");
      expect((await app.refresh()).application).toBeNull();
      expect(context.close).toHaveBeenCalled();
    } finally { launch(context); await opening.catch(() => {}); await app.close(); spy.mockRestore(); }
  });
});
