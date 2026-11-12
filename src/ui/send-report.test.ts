import { describe, expect, it } from "vitest";
import { sendReport } from "./send-report";
import type { FeedbackReport } from "../../shared/reports";

const report: FeedbackReport = { id: "1337a123-1234-4567-8123-123456789abc", kind: "bug", title: "Synthetic report", what: "Testing direct send", more: "", diagnostics: null };
describe("direct report transport", () => {
  it("requires a valid matching receipt, not just an HTTP success", async () => {
    const send = (body: unknown) => sendReport(report, { endpoint: "https://receiver.test/reports", fetch: async () => Response.json(body) });
    expect((await send({ ok: true })).ok).toBe(false);
    expect((await send({ id: crypto.randomUUID(), storedAt: new Date().toISOString(), notification: "sent" })).ok).toBe(false);
    expect((await send({ id: report.id, storedAt: new Date().toISOString(), notification: "sent" })).ok).toBe(true);
  });
  it("keeps the submission ID across network failures and retries", async () => {
    const ids: string[] = [];
    const doFetch: typeof fetch = async (_url, options) => { ids.push(JSON.parse(String(options?.body)).id); throw new Error("offline"); };
    expect((await sendReport(report, { endpoint: "https://receiver.test/reports", fetch: doFetch })).ok).toBe(false);
    await sendReport(report, { endpoint: "https://receiver.test/reports", fetch: doFetch });
    expect(ids).toEqual([report.id, report.id]);
  });
});
