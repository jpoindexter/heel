import type { Hono } from "hono";
import { AddInboxTaskInputSchema, SetGmailClientInputSchema } from "../../shared/api";
import { runDigest } from "../inbox/digest";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

/** Gmail digest: connect (read-only), look at recent unread mail, offer up to three as tasks. Nothing is ever sent or changed in Gmail. */
export function registerInboxRoutes(app: Hono, deps: AppDeps): void {
  const { store, inbox } = deps;

  app.get("/inbox/status", async (c) => ok(c, await inbox.status()));

  app.put("/inbox/client", async (c) => {
    const body = SetGmailClientInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"clientId": "...", "clientSecret": "..."}.');
    const saved = await inbox.setClient(body.data);
    return saved.ok ? ok(c, await inbox.status()) : fail(c, saved.error.code, saved.error.message);
  });

  app.post("/inbox/connect", async (c) => {
    const started = await inbox.connect();
    return started.ok ? ok(c, started.value) : fail(c, started.error.code, started.error.message);
  });

  app.post("/inbox/disconnect", async (c) => {
    await inbox.disconnect();
    return ok(c, await inbox.status());
  });

  app.post("/inbox/digest", async (c) => {
    const { provider, model } = store.settings.getBrain();
    if (!provider) return fail(c, "not_ready", "Choose an AI provider in Settings first.");
    const candidates = await inbox.candidates();
    if (!candidates.ok) return fail(c, candidates.error.code, candidates.error.message);
    const result = await runDigest({ provider: deps.providers[provider], model, candidates: candidates.value, now: Date.now(), signal: c.req.raw.signal });
    return result.ok ? ok(c, result.digest) : fail(c, result.error.code, result.error.message);
  });

  app.post("/inbox/add-task", async (c) => {
    const body = AddInboxTaskInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"messageId": "...", "title": "..."}.');
    const existing = store.tasks.list().find((t) => t.sourceRef === body.data.messageId);
    if (existing) return ok(c, { id: existing.id });
    const added = store.tasks.add({ title: body.data.title, source: "inbox", sourceRef: body.data.messageId });
    return added.ok ? ok(c, { id: added.value.id }) : fail(c, added.error.code, added.error.message);
  });
}
