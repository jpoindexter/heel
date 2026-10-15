import { describe, expect, it } from "vitest";
import { DigestSchema, DraftReplySchema, MailStatusSchema, SendReplySchema, envelope } from "../../shared/api";
import { fakeMail } from "../mail/source";
import { fakeProvider, setup } from "./test-app";

const inbox = () => fakeMail([
  { id: "m1", from: "Aoi", subject: "Panel questions", date: "2026-10-15T10:00:00.000Z", snippet: "Can you send the questions by Friday?" },
  { id: "m2", from: "Shop", subject: "Sale", date: "2026-10-14T10:00:00.000Z", snippet: "50% off" },
]);

async function appWith(reply: string, mail = inbox()) {
  const app = setup({ claude: fakeProvider("claude", {}, { ok: true, value: [] }, { ok: true, value: reply }) }, {}, mail);
  await app.put({ provider: "claude", model: null });
  return { ...app, mail };
}

describe("mail routes", () => {
  it("says Mail is available without touching it", async () => {
    expect(envelope(MailStatusSchema).parse(await setup().json("/mail/status"))).toEqual({ ok: true, data: { available: true } });
  });

  it("digests unread mail from this Mac: at most the items the AI picked, with what was sent shown", async () => {
    const { post } = await appWith('{"items":[{"id":"m1","summary":"They ask you to send the questions by Friday.","task":"Send Aoi the panel questions"}]}');
    const result = envelope(DigestSchema).parse(await post("/mail/digest"));
    expect(result.ok && result.data.items).toEqual([{ messageId: "m1", from: "Aoi", subject: "Panel questions", summary: "They ask you to send the questions by Friday.", taskTitle: "Send Aoi the panel questions" }]);
    expect(result.ok && result.data.considered).toBe(2);
    expect(result.ok && result.data.sentToModel).toContain("50% off");
  });

  it("needs an AI for the digest and for a draft", async () => {
    const { post } = setup();
    expect(await post("/mail/digest")).toMatchObject({ ok: false, error: { code: "not_ready" } });
    expect(await post("/mail/reply/draft", { messageId: "m1", from: "Aoi", subject: "S", summary: "x", instruction: "yes" })).toMatchObject({ ok: false, error: { code: "not_ready" } });
  });

  it("opens a message in Mail", async () => {
    const { post, mail } = await appWith("");
    expect(await post("/mail/open", { messageId: "m1" })).toEqual({ ok: true, data: { opened: true } });
    expect(mail.opened).toEqual(["m1"]);
  });

  it("drafts a reply without sending anything", async () => {
    const { post, mail } = await appWith("Hi Aoi, yes: Friday works. I'll send them Thursday.");
    const result = envelope(DraftReplySchema).parse(await post("/mail/reply/draft", { messageId: "m1", from: "Aoi", subject: "Panel questions", summary: "They ask for the questions by Friday.", instruction: "yes friday works, I'll send thursday" }));
    expect(result.ok && result.data.draft).toBe("Hi Aoi, yes: Friday works. I'll send them Thursday.");
    expect(result.ok && result.data.sentToModel).toContain("What I want to say: yes friday works");
    expect(mail.replies).toEqual([]);
  });

  it("sends only through /mail/reply/send, with the text the person approved; /open leaves it unsent in Mail", async () => {
    const { post, mail } = await appWith("");
    expect(await post("/mail/reply/open", { messageId: "m1", body: "Draft to finish" })).toEqual({ ok: true, data: { sent: false } });
    expect(envelope(SendReplySchema).parse(await post("/mail/reply/send", { messageId: "m1", body: "Yes, Friday works." }))).toEqual({ ok: true, data: { sent: true } });
    expect(mail.replies).toEqual([
      { messageId: "m1", body: "Draft to finish", send: false },
      { messageId: "m1", body: "Yes, Friday works.", send: true },
    ]);
  });

  it("refuses an empty reply and a message that is gone", async () => {
    const { post } = await appWith("");
    expect(await post("/mail/reply/send", { messageId: "m1", body: "" })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(await post("/mail/reply/send", { messageId: "gone", body: "x" })).toMatchObject({ ok: false, error: { code: "not_found" } });
  });
});
