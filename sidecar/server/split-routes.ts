import type { Hono } from "hono";
import { proposeSplit } from "../agent/split";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

/** Splitting a task (N23): propose (the AI, nothing written), apply (the steps the person kept), undo. */
export function registerSplitRoutes(app: Hono, deps: AppDeps): void {
  const { store } = deps;

  app.post("/tasks/:id/split/propose", async (c) => {
    const task = store.tasks.get(c.req.param("id"));
    if (!task.ok) return fail(c, task.error.code, task.error.message);
    const { provider, model } = store.settings.getBrain();
    if (!provider) return fail(c, "not_ready", "Choose an AI provider in Settings first.");
    const steps = await proposeSplit({ provider: deps.providers[provider], model, signal: c.req.raw.signal }, task.value);
    return steps.ok ? ok(c, { steps: steps.value }) : fail(c, steps.error.code, steps.error.message);
  });

  app.post("/tasks/:id/split", async (c) => {
    const result = store.split.apply(c.req.param("id"), await readJson(c));
    return result.ok ? ok(c, result.value) : fail(c, result.error.code, result.error.message);
  });

  app.post("/tasks/:id/unsplit", (c) => {
    const result = store.split.undo(c.req.param("id"));
    return result.ok ? ok(c, result.value) : fail(c, result.error.code, result.error.message);
  });
}
