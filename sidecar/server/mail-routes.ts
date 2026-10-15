import type { Hono } from "hono";
import { DraftReplyInputSchema, OpenMailInputSchema, SendReplyInputSchema } from "../../shared/api";
import { runDigest } from "../inbox/digest";
import { runDraft } from "../mail/draft";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

/**
 * Mail on this Mac. Reading and opening never change anything. A reply is drafted by the AI, shown to the person,
 * and only POST /mail/reply/send sends it (the panel calls that from the preview's Send button and nowhere else).
 */
export function registerMailRoutes(app: Hono, deps: AppDeps): void {
  const { store, mail } = deps;
  const brain = () => {
    const { provider, model } = store.settings.getBrain();
    return provider ? { provider: deps.providers[provider], model } : null;
  };

  app.get("/mail/status", (c) => ok(c, { available: deps.mailAvailable }));

  app.post("/mail/digest", async (c) => {
    const ai = brain();
    if (!ai) return fail(c, "not_ready", "Choose an AI provider in Settings first.");
    const candidates = await mail.candidates();
    if (!candidates.ok) return fail(c, candidates.error.code, candidates.error.message);
    const result = await runDigest({ ...ai, candidates: candidates.value, now: Date.now(), signal: c.req.raw.signal });
    return result.ok ? ok(c, result.digest) : fail(c, result.error.code, result.error.message);
  });

  app.post("/mail/open", async (c) => {
    const body = OpenMailInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"messageId": "..."}.');
    const opened = await mail.open(body.data.messageId);
    return opened.ok ? ok(c, { opened: true }) : fail(c, opened.error.code, opened.error.message);
  });

  app.post("/mail/reply/draft", async (c) => {
    const body = DraftReplyInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", "Say what you want to reply (a few words is enough).");
    const ai = brain();
    if (!ai) return fail(c, "not_ready", "Choose an AI provider in Settings first.");
    const result = await runDraft({ ...ai, draft: body.data, signal: c.req.raw.signal });
    return result.ok ? ok(c, { draft: result.draft, sentToModel: result.sentToModel }) : fail(c, result.error.code, result.error.message);
  });

  /** Put the reply in Mail for the person to finish there. Nothing is sent. */
  app.post("/mail/reply/open", async (c) => {
    const body = SendReplyInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", "The reply text is missing.");
    const result = await mail.reply({ messageId: body.data.messageId, body: body.data.body, send: false });
    return result.ok ? ok(c, { sent: false }) : fail(c, result.error.code, result.error.message);
  });

  app.post("/mail/reply/send", async (c) => {
    const body = SendReplyInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", "The reply text is missing.");
    const result = await mail.reply({ messageId: body.data.messageId, body: body.data.body, send: true });
    return result.ok ? ok(c, { sent: result.value.sent }) : fail(c, result.error.code, result.error.message);
  });
}
