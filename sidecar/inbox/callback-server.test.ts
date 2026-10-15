import { describe, expect, it } from "vitest";
import { startCallbackServer } from "./callback-server";

describe("startCallbackServer", () => {
  it("hands back the code when Google redirects with the right state", async () => {
    const server = await startCallbackServer("good", 5_000);
    expect(server.redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/);
    const page = await fetch(`${server.redirectUri}?code=abc&state=good`);
    expect(await page.text()).toContain("close this tab");
    expect(await server.result).toEqual({ ok: true, code: "abc" });
  });

  it("refuses a redirect with the wrong state", async () => {
    const server = await startCallbackServer("good", 5_000);
    await fetch(`${server.redirectUri}?code=abc&state=bad`);
    expect(await server.result).toMatchObject({ ok: false });
  });

  it("gives up after the timeout instead of listening forever", async () => {
    const server = await startCallbackServer("good", 50);
    expect(await server.result).toMatchObject({ ok: false, message: expect.stringContaining("in time") });
  });
});
