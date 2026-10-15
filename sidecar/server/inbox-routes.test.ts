import { describe, expect, it } from "vitest";
import { DigestSchema, InboxStatusSchema, envelope } from "../../shared/api";
import { fakeProvider, setup } from "./test-app";

const status = envelope(InboxStatusSchema);
const digest = envelope(DigestSchema);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const connectedSecrets = () => ({
  "gmail-client": JSON.stringify({ clientId: "c", clientSecret: "s" }),
  "gmail-tokens": JSON.stringify({ accessToken: "tok", expiresAt: 9e12, refreshToken: "r", account: "jo@example.com" }),
});

const gmail = (async (url: string | URL | Request) => {
  const u = String(url);
  if (u.includes("/messages?")) return json({ messages: [{ id: "m1" }, { id: "m2" }] });
  const id = u.includes("/m1") ? "m1" : "m2";
  return json({ id, snippet: id === "m1" ? "Can you send the invoice by Friday?" : "Sale!", payload: { headers: [{ name: "From", value: "Aoi" }, { name: "Subject", value: `S ${id}` }] } });
}) as typeof fetch;

async function connectedApp(reply: string) {
  const { memorySecrets } = await import("../inbox/keychain");
  const app = setup({ claude: fakeProvider("claude", {}, { ok: true, value: [] }, { ok: true, value: reply }) }, { fetch: gmail, secrets: memorySecrets(connectedSecrets()) });
  await app.put({ provider: "claude", model: null });
  return app;
}

describe("inbox routes", () => {
  it("starts unconfigured", async () => {
    expect(status.parse(await setup().json("/inbox/status"))).toEqual({ ok: true, data: { configured: false, connected: false, account: null, problem: null } });
  });

  it("saves the client and says it is configured, without ever returning the secret", async () => {
    const { json: get, call } = setup();
    const put = await call("/inbox/client", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: "cid", clientSecret: "SECRET-VALUE" }) });
    const text = await put.text();
    expect(text).not.toContain("SECRET-VALUE");
    expect(JSON.parse(text)).toMatchObject({ ok: true, data: { configured: true, connected: false } });
    expect(JSON.stringify(await get("/inbox/status"))).not.toContain("SECRET-VALUE");
  });

  it("returns up to three actionable emails with what was sent to the AI", async () => {
    const { post } = await connectedApp('{"items":[{"id":"m1","summary":"They ask you to send the invoice by Friday.","task":"Send Aoi the invoice"}]}');
    const result = digest.parse(await post("/inbox/digest"));
    expect(result).toMatchObject({ ok: true, data: { considered: 2, items: [{ messageId: "m1", taskTitle: "Send Aoi the invoice" }] } });
    if (result.ok) expect(result.data.sentToModel).toContain("S m1");
  });

  it("says Gmail isn't connected, and asks for an AI first when none is chosen", async () => {
    expect(await setup().post("/inbox/digest")).toMatchObject({ ok: false, error: { code: "not_ready" } });
    const app = setup();
    await app.put({ provider: "claude", model: null });
    expect(await app.post("/inbox/digest")).toMatchObject({ ok: false, error: { code: "not_connected" } });
  });

  it("adds a digest item as an inbox task once, however many times it is clicked", async () => {
    const { post, store } = setup();
    await post("/inbox/add-task", { messageId: "m1", title: "Send Aoi the invoice" });
    await post("/inbox/add-task", { messageId: "m1", title: "Send Aoi the invoice" });
    expect(store.tasks.list().map((t) => [t.title, t.source, t.sourceRef])).toEqual([["Send Aoi the invoice", "inbox", "m1"]]);
  });
});
