import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { ReceiverEnv, Statement } from "./env";
import { feedbackReceiver } from "./receiver";

function setup(failNotification = false) {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  const messages: unknown[] = [];
  const prepare = (sql: string): Statement => {
    let values: unknown[] = [];
    const statement: Statement = { bind: (...args) => { values = args; return statement; }, first: async <T>() => db.prepare(sql).get(...values as never[]) as T ?? null, run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...values as never[]).changes) } }) };
    return statement;
  };
  const env: ReceiverEnv = { DB: { prepare }, REPORT_LIMITER: { limit: async () => ({ success: true }) }, FEEDBACK_FROM: "feedback@example.test", EMAIL: { send: async message => { messages.push(message); if (failNotification) throw new Error("unknown delivery result"); return { messageId: "synthetic-message-id" }; } } };
  const app = feedbackReceiver();
  const send = (body: unknown, headers: Record<string, string> = {}) => app.request("http://receiver.test/reports", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }, env);
  return { db, messages, send, env };
}

const report = () => ({ id: randomUUID(), kind: "bug", title: "Synthetic in-app report", what: "Testing direct delivery only", more: "", diagnostics: null });

describe("private feedback receiver", () => {
  it("stores once and returns the same receipt when a caller retries a lost response", async () => {
    const test = setup(), body = report();
    const first = await test.send(body);
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({ id: body.id, notification: "sent" });
    expect(await (await test.send(body)).json()).toMatchObject({ id: body.id, notification: "sent" });
    expect(test.messages).toHaveLength(1);
    expect(test.db.prepare("SELECT COUNT(*) AS n FROM reports").get()!.n).toBe(1);
    expect((await test.send({ ...body, what: "Changed report" })).status).toBe(409);
    test.db.close();
  });
  it("keeps a report when email delivery is uncertain, without duplicating the notification", async () => {
    const test = setup(true), body = report();
    expect(await (await test.send(body)).json()).toMatchObject({ id: body.id, notification: "uncertain" });
    await test.send(body);
    expect(test.messages).toHaveLength(1);
    expect(test.db.prepare("SELECT payload FROM reports").get()!.payload).toContain(body.what);
    test.db.close();
  });
  it("rejects recipient injection and arbitrary diagnostic fields before storing anything", async () => {
    const test = setup();
    expect((await test.send({ ...report(), to: "someone@example.test" })).status).toBe(400);
    expect((await test.send({ ...report(), diagnostics: { tasks: ["PRIVATE TASK"] } })).status).toBe(400);
    expect(test.messages).toHaveLength(0); test.db.close();
  });
  it("enforces origin, body size and request rate limits", async () => {
    const test = setup();
    expect((await test.send(report(), { origin: "https://unknown.example" })).status).toBe(403);
    expect((await test.send({ ...report(), what: "x".repeat(65_537) })).status).toBe(413);
    test.env.REPORT_LIMITER.limit = async () => ({ success: false });
    expect((await test.send(report())).status).toBe(429);
    expect(test.messages).toHaveLength(0); test.db.close();
  });
  it("claims concurrent duplicate requests once", async () => {
    const test = setup(), body = report();
    const responses = await Promise.all([test.send(body), test.send(body)]);
    for (const response of responses) expect(await response.json()).toMatchObject({ id: body.id });
    expect(test.messages).toHaveLength(1); test.db.close();
  });
});
