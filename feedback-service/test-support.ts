import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import type { ReceiverEnv, Statement } from "./env";
import { feedbackReceiver } from "./receiver";

export function receiverFixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  const messages: unknown[] = [];
  const prepare = (sql: string): Statement => {
    let values: unknown[] = [];
    const statement: Statement = { bind: (...args) => { values = args; return statement; }, first: async <T>() => db.prepare(sql).get(...values as never[]) as T ?? null, run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...values as never[]).changes) } }) };
    return statement;
  };
  const env: ReceiverEnv = { DB: { prepare }, REPORT_LIMITER: { limit: async () => ({ success: true }) }, FEEDBACK_FROM: "feedback@example.test", EMAIL: { send: async message => { messages.push(message); return { messageId: "synthetic-message-id" }; } } };
  const app = feedbackReceiver();
  return { db, env, app, messages };
}
