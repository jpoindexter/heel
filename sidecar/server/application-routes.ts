import { bodyLimit } from "hono/body-limit";
import type { Hono } from "hono";
import { z } from "zod";
import { ApplicationStartSchema, ApproveApplicationSchema, AttachApplicationSchema, BrowserAssistSchema, EditApplicationSchema, FillApplicationSchema, ObservedConfirmationSchema, StageApplicationSchema, UploadApplicationSchema } from "../../shared/applications";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

export function registerApplicationRoutes(app: Hono, deps: AppDeps) {
  const service = deps.applications;
  app.use("/applications/*", bodyLimit({ maxSize: 7 * 1024 * 1024, onError: c => fail(c, "invalid", "This attachment is too large. Choose a file up to 5 MB.") }));
  app.get("/applications", async c => {
    if (!service) return ok(c, { application: null });
    try { return ok(c, await service.exclusive(() => service.refresh())); }
    catch (error) { return fail(c, "conflict", error instanceof Error ? error.message : String(error)); }
  });
  const post = <T extends z.ZodType>(path: string, schema: T, run: (value: z.output<T>, signal: AbortSignal) => Promise<unknown>) => {
    app.post(`/applications/${path}`, async c => {
      if (!service) return fail(c, "not_ready", "The application browser is unavailable. Restart Heel's helper.");
      const body = schema.safeParse(await readJson(c));
      if (!body.success) return fail(c, "invalid", body.error.issues[0]?.message ?? "Check the application details.");
      try { return ok(c, await service.exclusive(() => run(body.data, c.req.raw.signal))); }
      catch (error) { return fail(c, "conflict", error instanceof Error ? error.message : String(error)); }
    });
  };
  post("open", ApplicationStartSchema, value => service!.open(value));
  post("fill", FillApplicationSchema, (value, signal) => {
    const brain = deps.store.settings.getBrain();
    if (!brain.provider) throw new Error("Choose an AI in Settings, or edit the form fields yourself.");
    return service!.fill(value.facts, { provider: deps.providers[brain.provider], model: brain.model, signal });
  });
  post("edit", EditApplicationSchema, value => service!.edit(value.values));
  post("stage", StageApplicationSchema, value => service!.stage(value));
  post("approve", ApproveApplicationSchema, value => service!.approve(value));
  post("attach", AttachApplicationSchema, value => service!.attach(value.field, value.attachment));
  post("upload", UploadApplicationSchema, async value => ({ attachment: service!.upload(value) }));
  post("read-cv", z.object({ attachment: z.string(), facts: z.string().max(20_000).optional() }), value => service!.readCv(value.attachment, value.facts));
  post("show", z.object({}), () => service!.show());
  post("view", z.object({}), () => service!.browserView());
  post("confirm-observed", ObservedConfirmationSchema, value => service!.acceptObservedConfirmation(value.quote));
  post("assist", BrowserAssistSchema, (value, signal) => {
    const brain = deps.store.settings.getBrain();
    if (!brain.provider) throw new Error("Choose an AI that accepts images in Settings first.");
    return service!.assist(value, { provider: deps.providers[brain.provider], model: brain.model, signal });
  });
  // Cancellation must remain reachable while a provider or page action owns the operation lock.
  app.post("/applications/cancel", async c => {
    if (!service) return fail(c, "not_ready", "The application browser is unavailable.");
    try { return ok(c, await service.cancel()); }
    catch { return fail(c, "conflict", "The browser could not be closed. Check its window before continuing."); }
  });
}
