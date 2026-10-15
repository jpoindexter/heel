import { describe, expect, it } from "vitest";
import type { RunCommand } from "../agent/providers/process";
import type { JxaRunner } from "./jxa";
import { LIST_UNREAD, NEW_DRAFT, REPLY } from "./scripts";
import { appleMail, fakeMail, messageUrl } from "./source";

const noRun: RunCommand = async () => ({ ok: true, stdout: "", stderr: "" });

describe("messageUrl", () => {
  it("wraps the Message-ID in angle brackets, URL-encoded, whether or not Mail gave them", () => {
    expect(messageUrl("abc@x.com")).toBe("message://%3Cabc%40x.com%3E");
    expect(messageUrl("<abc@x.com>")).toBe("message://%3Cabc%40x.com%3E");
  });
});

describe("appleMail", () => {
  it("lists unread mail as candidates with the preview as the snippet", async () => {
    const calls: { script: string; input: unknown }[] = [];
    const jxa: JxaRunner = async (script, input) => {
      calls.push({ script, input });
      return { ok: true, value: { items: [{ id: "m1", from: "Aoi", subject: "Panel", date: "2026-10-15T10:00:00.000Z", preview: "Can you send it by Friday?" }], accounts: 3 } };
    };
    const result = await appleMail(jxa, noRun).candidates();
    expect(result).toEqual({ ok: true, value: [{ id: "m1", from: "Aoi", subject: "Panel", date: "2026-10-15T10:00:00.000Z", snippet: "Can you send it by Friday?" }] });
    expect(calls[0]!.script).toBe(LIST_UNREAD);
    expect(calls[0]!.input).toEqual({ days: 7, limit: 15, previewChars: 300 });
  });

  it("sends a reply only when told to, and strips angle brackets from the id", async () => {
    const calls: { script: string; input: unknown }[] = [];
    const jxa: JxaRunner = async (script, input) => (calls.push({ script, input }), { ok: true, value: { ok: true, sent: (input as { send: boolean }).send } });
    const mail = appleMail(jxa, noRun);
    expect(await mail.reply({ messageId: "<m1>", body: "Yes, Friday works.", send: false })).toEqual({ ok: true, value: { sent: false } });
    expect(await mail.reply({ messageId: "m1", body: "Yes, Friday works.", send: true })).toEqual({ ok: true, value: { sent: true } });
    expect(calls.map((c) => c.script)).toEqual([REPLY, REPLY]);
    expect(calls.map((c) => c.input)).toEqual([
      { id: "m1", body: "Yes, Friday works.", send: false },
      { id: "m1", body: "Yes, Friday works.", send: true },
    ]);
  });

  it("says when the message is gone, and passes Mail's own refusal through", async () => {
    const gone: JxaRunner = async () => ({ ok: true, value: { ok: false, error: "not_found" } });
    expect(await appleMail(gone, noRun).reply({ messageId: "m9", body: "x", send: true })).toMatchObject({ ok: false, error: { code: "not_found" } });
    const refused: JxaRunner = async () => ({ ok: false, error: { code: "not_allowed", message: "no" } });
    expect(await appleMail(refused, noRun).candidates()).toEqual({ ok: false, error: { code: "not_allowed", message: "no" } });
  });

  it("opens a message with the open command and the message:// link", async () => {
    const seen: string[][] = [];
    const run: RunCommand = async (exe, args) => (seen.push([exe, ...args]), { ok: true, stdout: "", stderr: "" });
    await appleMail(async () => ({ ok: true, value: {} }), run).open("m1@x");
    expect(seen).toEqual([["/usr/bin/open", "message://%3Cm1%40x%3E"]]);
  });
});

describe("appleMail draft", () => {
  it("opens a new draft through the NEW_DRAFT script with exactly to, subject and body", async () => {
    const calls: { script: string; input: unknown }[] = [];
    const jxa: JxaRunner = async (script, input) => (calls.push({ script, input }), { ok: true, value: { ok: true } });
    expect(await appleMail(jxa, noRun).draft({ to: "", subject: "S", body: "B" })).toEqual({ ok: true, value: true });
    expect(calls).toEqual([{ script: NEW_DRAFT, input: { to: "", subject: "S", body: "B" } }]);
  });
});

describe("fakeMail", () => {
  it("records replies and refuses unknown ids", async () => {
    const mail = fakeMail([{ id: "m1", from: "A", subject: "S", date: "d", snippet: "p" }]);
    await mail.reply({ messageId: "m1", body: "ok", send: true });
    expect(mail.replies).toEqual([{ messageId: "m1", body: "ok", send: true }]);
    expect((await mail.reply({ messageId: "nope", body: "ok", send: true })).ok).toBe(false);
  });
});
