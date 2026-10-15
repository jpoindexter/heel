import type { Hono } from "hono";
import { RestoreInputSchema, SaveMessageInputSchema } from "../../shared/api";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

/** The conversation, kept so it survives a restart. */
export function registerMessagesRoutes(app: Hono, deps: AppDeps): void {
  const { store } = deps;

  app.get("/messages", (c) => ok(c, store.messages.list()));

  app.put("/messages/:id", async (c) => {
    const body = SaveMessageInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"message": {...}}.');
    if (String(body.data.message.id) !== c.req.param("id")) return fail(c, "invalid", "The id in the address and in the message must match.");
    const saved = store.messages.save(body.data.message);
    return saved.ok ? ok(c, { id: saved.value.id }) : fail(c, saved.error.code, saved.error.message);
  });

  app.post("/messages/clear", (c) => ok(c, store.messages.clear()));

  app.post("/messages/restore", async (c) => {
    const body = RestoreInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"clearedAt": 123}.');
    return ok(c, store.messages.restore(body.data.clearedAt));
  });
}
