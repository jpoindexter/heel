import type { Hono } from "hono";
import { MethodSchema } from "../../shared/method";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

/** Ways of working (N17): read and change the chosen method, and a task's size, bucket or estimate. */
export function registerMethodRoutes(app: Hono, { store }: AppDeps): void {
  app.get("/method", (c) => ok(c, store.settings.getMethod()));

  app.put("/method", async (c) => {
    const body = MethodSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"timer": "timebox", "structure": "none" | "pickle-jar", "sizing": "none" | "tshirt"}.');
    const saved = store.settings.setMethod(body.data);
    return saved.ok ? ok(c, saved.value) : fail(c, saved.error.code, saved.error.message);
  });

  app.patch("/tasks/:id", async (c) => {
    const result = store.tasks.patch(c.req.param("id"), await readJson(c));
    return result.ok ? ok(c, { task: result.value }) : fail(c, result.error.code, result.error.message);
  });
}
