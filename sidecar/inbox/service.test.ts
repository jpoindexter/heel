import { describe, expect, it } from "vitest";
import type { CallbackServer } from "./callback-server";
import { memorySecrets } from "./keychain";
import { createInbox } from "./service";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

type Route = (url: string, init?: RequestInit) => Response | undefined;
function fakeGoogle(extra: Route[] = []) {
  const calls: string[] = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push(`${init?.method ?? "GET"} ${u}`);
    for (const route of extra) {
      const hit = route(u, init);
      if (hit) return hit;
    }
    if (u.startsWith("https://oauth2.googleapis.com/token")) return json({ access_token: "access-1", expires_in: 3600, refresh_token: "refresh-1" });
    if (u.includes("/profile")) return json({ emailAddress: "jo@example.com" });
    if (u.includes("/messages?")) return json({ messages: [{ id: "m1" }] });
    if (u.includes("/messages/m1")) return json({ id: "m1", snippet: "Please reply", payload: { headers: [{ name: "From", value: "Aoi" }, { name: "Subject", value: "Q" }] } });
    return json({}, 404);
  }) as typeof fetch;
  return { fetcher, calls };
}

function fakeCallback(): { start: (state: string, ms: number) => Promise<CallbackServer>; deliver: (code: string) => void; lastState: () => string; closed: () => boolean } {
  let state = "";
  let closed = false;
  let resolve: (value: { ok: true; code: string }) => void = () => undefined;
  const result = new Promise<{ ok: true; code: string }>((r) => (resolve = r));
  return {
    start: async (s) => ((state = s), { redirectUri: "http://127.0.0.1:1/callback", result, close: () => void (closed = true) }),
    deliver: (code) => resolve({ ok: true, code }),
    lastState: () => state,
    closed: () => closed,
  };
}

describe("inbox service", () => {
  it("starts unconfigured, refuses to connect until a client is saved, and rejects an empty one", async () => {
    const inbox = createInbox({ fetch: fakeGoogle().fetcher, secrets: memorySecrets(), now: () => 0, openUrl: async () => undefined });
    expect(await inbox.status()).toEqual({ configured: false, connected: false, account: null, problem: null });
    expect(await inbox.connect()).toMatchObject({ ok: false, error: { code: "not_ready" } });
    expect(await inbox.setClient({ clientId: " ", clientSecret: "x" })).toMatchObject({ ok: false });
  });

  it("connects: opens Google sign-in for read-only Gmail, then stores tokens in the secret store and shows who is connected", async () => {
    const secrets = memorySecrets();
    const callback = fakeCallback();
    const opened: string[] = [];
    const { fetcher } = fakeGoogle();
    const inbox = createInbox({ fetch: fetcher, secrets, now: () => 0, openUrl: async (u) => void opened.push(u), startCallback: callback.start });
    await inbox.setClient({ clientId: "cid", clientSecret: "csecret" });
    const started = await inbox.connect();
    expect(started.ok).toBe(true);
    expect(opened).toHaveLength(1);
    expect(new URL(opened[0]!).searchParams.get("scope")).toBe("https://www.googleapis.com/auth/gmail.readonly");
    callback.deliver("the-code");
    await new Promise((r) => setTimeout(r, 20));
    expect(await inbox.status()).toEqual({ configured: true, connected: true, account: "jo@example.com", problem: null });
    expect(await secrets.get("gmail-tokens")).toContain("refresh-1");
  });

  it("refreshes an expired access token before reading mail, and saves the new one", async () => {
    const secrets = memorySecrets({
      "gmail-client": JSON.stringify({ clientId: "cid", clientSecret: "s" }),
      "gmail-tokens": JSON.stringify({ accessToken: "old", expiresAt: 1_000, refreshToken: "refresh-1", account: "jo@example.com" }),
    });
    const { fetcher, calls } = fakeGoogle();
    const inbox = createInbox({ fetch: fetcher, secrets, now: () => 5_000_000, openUrl: async () => undefined });
    const result = await inbox.candidates();
    expect(result).toMatchObject({ ok: true, value: [{ id: "m1", snippet: "Please reply" }] });
    expect(calls.some((c) => c.startsWith("POST https://oauth2.googleapis.com/token"))).toBe(true);
    expect(await secrets.get("gmail-tokens")).toContain("access-1");
  });

  it("says 'not connected' instead of a vague error when nothing is connected", async () => {
    const inbox = createInbox({ fetch: fakeGoogle().fetcher, secrets: memorySecrets(), now: () => 0, openUrl: async () => undefined });
    expect(await inbox.candidates()).toMatchObject({ ok: false, error: { code: "not_connected" } });
  });

  it("disconnect forgets the tokens; changing the client forgets them too", async () => {
    const secrets = memorySecrets({ "gmail-client": JSON.stringify({ clientId: "c", clientSecret: "s" }), "gmail-tokens": JSON.stringify({ accessToken: "a", expiresAt: 9e12, refreshToken: "r", account: "a@b.c" }) });
    const inbox = createInbox({ fetch: fakeGoogle().fetcher, secrets, now: () => 0, openUrl: async () => undefined });
    await inbox.setClient({ clientId: "new", clientSecret: "new" });
    expect((await inbox.status()).connected).toBe(false);
    await secrets.set("gmail-tokens", JSON.stringify({ accessToken: "a", expiresAt: 9e12, refreshToken: "r", account: "a@b.c" }));
    await inbox.disconnect();
    expect((await inbox.status()).connected).toBe(false);
  });

  it("answers with a sentence and closes the listener when the browser can't be opened", async () => {
    const callback = fakeCallback();
    const inbox = createInbox({ fetch: fakeGoogle().fetcher, secrets: memorySecrets(), now: () => 0, openUrl: async () => { throw new Error("open: not permitted"); }, startCallback: callback.start });
    await inbox.setClient({ clientId: "cid", clientSecret: "csecret" });
    expect(await inbox.connect()).toMatchObject({ ok: false, error: { code: "failed", message: expect.stringContaining("open: not permitted") } });
    expect(callback.closed()).toBe(true);
    expect(await inbox.status()).toMatchObject({ connected: false, problem: null });
  });

  it("reports a failed connect as a sentence in status, not a crash", async () => {
    const callback = fakeCallback();
    const refuse: Route = (u) => (u.startsWith("https://oauth2.googleapis.com/token") ? json({ error: "invalid_client" }, 401) : undefined);
    const inbox = createInbox({ fetch: fakeGoogle([refuse]).fetcher, secrets: memorySecrets(), now: () => 0, openUrl: async () => undefined, startCallback: callback.start });
    await inbox.setClient({ clientId: "cid", clientSecret: "wrong" });
    await inbox.connect();
    callback.deliver("code");
    await new Promise((r) => setTimeout(r, 20));
    expect(await inbox.status()).toMatchObject({ connected: false, problem: expect.stringContaining("Check the client ID and secret") });
  });
});
