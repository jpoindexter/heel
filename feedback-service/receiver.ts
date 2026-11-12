import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { FeedbackReportSchema, type FeedbackReport } from "../shared/reports";
import type { ReceiverEnv, StoredReport } from "./env";

const DESTINATION = "jason@theft.studio";
const ORIGINS = ["tauri://localhost", "http://tauri.localhost", "http://localhost:1420"];
const receipt = (row: StoredReport) => ({ id: row.id, storedAt: row.stored_at, notification: row.notification });
const lookup = (env: ReceiverEnv, id: string) => env.DB.prepare("SELECT id, digest, stored_at, notification FROM reports WHERE id = ?").bind(id).first<StoredReport>();

async function digest(report: FeedbackReport) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(report)));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, "0")).join("");
}

async function notify(env: ReceiverEnv, report: FeedbackReport) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const sent = await Promise.race([
      env.EMAIL.send({ to: DESTINATION, from: env.FEEDBACK_FROM, subject: `[Heel ${report.kind}] ${report.title}`, text: `${report.what}\n\n${report.more}\n\nReport: ${report.id}\n\n${report.diagnostics ? JSON.stringify(report.diagnostics, null, 2) : "Debug details not included."}` }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Notification deadline")), 8000); }),
    ]);
    await env.DB.prepare("UPDATE reports SET notification = 'sent', message_id = ? WHERE id = ?").bind(sent.messageId, report.id).run();
  } catch {
    // The report is durable; an ambiguous email is never automatically sent a second time.
    await env.DB.prepare("UPDATE reports SET notification = 'uncertain' WHERE id = ?").bind(report.id).run();
  } finally { clearTimeout(timer); }
}

export function feedbackReceiver() {
  const app = new Hono<{ Bindings: ReceiverEnv }>();
  app.use("*", cors({ origin: origin => ORIGINS.includes(origin) ? origin : undefined, allowMethods: ["POST", "GET", "OPTIONS"], allowHeaders: ["content-type"] }));
  app.use("*", bodyLimit({ maxSize: 64 * 1024, onError: c => c.json({ error: "Report too large" }, 413) }));
  app.get("/health", c => c.json({ status: "ok" }));
  app.post("/reports", async c => {
    const origin = c.req.header("origin");
    if (origin && !ORIGINS.includes(origin)) return c.json({ error: "Origin not allowed" }, 403);
    if (!(await c.env.REPORT_LIMITER.limit({ key: c.req.header("cf-connecting-ip") ?? "unknown" })).success) return c.json({ error: "Try again later" }, 429);
    const parsed = FeedbackReportSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid report" }, 400);
    const report = parsed.data, hash = await digest(report), previous = await lookup(c.env, report.id);
    if (previous) return previous.digest === hash ? c.json(receipt(previous)) : c.json({ error: "Report ID already used" }, 409);
    const storedAt = new Date().toISOString(), day = `${storedAt.slice(0, 10)}T00:00:00.000Z`;
    const claimed = await c.env.DB.prepare("INSERT INTO reports(id, digest, payload, stored_at) SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM reports WHERE stored_at >= ?) < 100 ON CONFLICT(id) DO NOTHING").bind(report.id, hash, JSON.stringify(report), storedAt, day).run();
    if (!claimed.meta.changes) {
      const row = await lookup(c.env, report.id);
      return row ? row.digest === hash ? c.json(receipt(row)) : c.json({ error: "Report ID already used" }, 409) : c.json({ error: "Daily limit reached" }, 429);
    }
    await notify(c.env, report);
    const row = await lookup(c.env, report.id);
    if (!row) return c.json({ error: "Receipt unavailable" }, 503);
    return c.json(receipt(row), 201);
  });
  return app;
}
