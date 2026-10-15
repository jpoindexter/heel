import type { Hono } from "hono";
import { TextInputSchema } from "../../shared/api";
import { runTurn } from "../agent/turn";
import type { Result } from "../store/result";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

const TEXT_HINT = "Send {\"text\": \"...\"}.";

type Transition = "complete" | "drop" | "restore";

/** Tasks, parking, and the conversation turn: everything the Today tab calls. */
export function registerTodayRoutes(app: Hono, deps: AppDeps): void {
  const { store } = deps;

  app.get("/tasks", (c) => ok(c, { tasks: store.tasks.list(), parkedCount: store.parked.list().length }));

  app.post("/tasks/:id/:action", (c) => {
    const action = c.req.param("action") as Transition;
    const run: Record<Transition, (id: string) => Result<unknown>> = {
      complete: store.tasks.complete,
      drop: store.tasks.drop,
      restore: store.tasks.restore,
    };
    if (!(action in run)) return fail(c, "invalid", "Action must be complete, drop or restore.");
    const result = run[action](c.req.param("id"));
    return result.ok ? ok(c, { task: result.value }) : fail(c, result.error.code, result.error.message);
  });

  app.post("/parked", async (c) => {
    const body = TextInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", TEXT_HINT);
    const parked = store.parked.park({ idea: body.data.text });
    return parked.ok ? ok(c, { id: parked.value.id }) : fail(c, parked.error.code, parked.error.message);
  });

  app.post("/turn", async (c) => {
    const body = TextInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", TEXT_HINT);
    const { provider, model } = store.settings.getBrain();
    if (!provider) return fail(c, "not_ready", "Choose an AI provider in Settings first.");
    const result = await runTurn({ store, provider: deps.providers[provider], model }, body.data.text);
    if (!result.ok) return fail(c, result.error.code, result.error.message);
    return ok(c, { say: result.say, applied: result.applied, skills: result.skills, provider: result.provider });
  });
}
