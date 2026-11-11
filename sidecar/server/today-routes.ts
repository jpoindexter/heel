import type { Hono } from "hono";
import { AddTaskInputSchema, TextInputSchema, TurnInputSchema } from "../../shared/api";
import { runTurn } from "../agent/turn";
import { makePdf } from "../pdf/make-pdf";
import type { Result } from "../store/result";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

const TEXT_HINT = "Send {\"text\": \"...\"}.";
const HISTORY_DEFAULT_DAYS = 30;
const HISTORY_MAX_DAYS = 90;

type Transition = "complete" | "drop" | "restore";

/** What was finished, by day, with the week's counts. `days` is how far back the list goes (1–90, default 30). */
function registerHistoryRoute(app: Hono, { store }: AppDeps): void {
  app.get("/history", (c) => {
    const asked = Number(c.req.query("days") ?? HISTORY_DEFAULT_DAYS);
    const days = Number.isInteger(asked) ? Math.min(HISTORY_MAX_DAYS, Math.max(1, asked)) : HISTORY_DEFAULT_DAYS;
    return ok(c, store.history.list(days));
  });
}

/** The open list, each split task carrying how many of its steps are finished (N23). */
function registerTasksRoute(app: Hono, { store }: AppDeps): void {
  app.get("/tasks", (c) => {
    const done = store.split.doneCounts();
    const tasks = store.tasks.list().map((task) => (done[task.id] ? { ...task, stepsDone: done[task.id] } : task));
    return ok(c, { tasks, parkedCount: store.parked.list().length, doneToday: store.history.doneToday() });
  });
}

/** Tasks and parked ideas: what the drawer and the Now strip call. */
export function registerTodayRoutes(app: Hono, deps: AppDeps): void {
  const { store } = deps;

  registerTasksRoute(app, deps);
  registerHistoryRoute(app, deps);

  /** Add a task by hand: no AI, so it is instant and costs nothing. */
  app.post("/tasks", async (c) => {
    const body = AddTaskInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"title": "..."}.');
    const added = store.tasks.add({ title: body.data.title, nowStep: body.data.nowStep ?? null, source: "manual" });
    return added.ok ? ok(c, { task: added.value }) : fail(c, added.error.code, added.error.message);
  });

  app.post("/tasks/:id/:action", (c) => {
    const action = c.req.param("action") as Transition;
    const run: Record<Transition, (id: string) => Result<unknown>> = {
      complete: store.tasks.complete,
      drop: store.tasks.drop,
      restore: store.tasks.restore,
    };
    if (!Object.hasOwn(run, action)) return fail(c, "invalid", "Action must be complete, drop or restore.");
    const result = run[action](c.req.param("id"));
    return result.ok ? ok(c, { task: result.value }) : fail(c, result.error.code, result.error.message);
  });

  app.post("/parked", async (c) => {
    const body = TextInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", TEXT_HINT);
    const parked = store.parked.park({ idea: body.data.text });
    return parked.ok ? ok(c, { id: parked.value.id }) : fail(c, parked.error.code, parked.error.message);
  });

  app.get("/parked", (c) =>
    ok(c, { parked: store.parked.list().map((p) => ({ id: p.id, idea: p.idea, createdAt: p.createdAt })) }),
  );

  app.post("/parked/:id/promote", (c) => {
    const result = store.parked.promote(c.req.param("id"));
    return result.ok ? ok(c, { task: result.value }) : fail(c, result.error.code, result.error.message);
  });

  app.post("/parked/:id/unpark", (c) => {
    const result = store.parked.unpark(c.req.param("id"));
    return result.ok ? ok(c, result.value) : fail(c, result.error.code, result.error.message);
  });
}

/** The conversation turn: ask the chosen AI, apply only what validates. */
export function registerTurnRoute(app: Hono, deps: AppDeps): void {
  const { store } = deps;

  app.post("/turn", async (c) => {
    const body = TurnInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", TEXT_HINT);
    const { provider, model } = store.settings.getBrain();
    if (!provider) return fail(c, "not_ready", "Choose an AI provider in Settings first.");
    // "Make that a PDF" opens it too, as the PDF route does: the person asked to see it.
    const makeAndOpenPdf = async (id: string) => {
      const made = await makePdf(store, deps.renderPdf, id);
      if (made.ok && made.value.pdfPath) await deps.openFile(made.value.pdfPath, false);
      return made;
    };
    const result = await runTurn({ applications: deps.applications, store, provider: deps.providers[provider], model, mail: deps.mail, apps: deps.apps, skills: deps.skills, makePdf: makeAndOpenPdf, signal: c.req.raw.signal }, body.data.text, body.data.history);
    if (!result.ok) return fail(c, result.error.code, result.error.message);
    return ok(c, { say: result.say, applied: result.applied, skills: result.skills, provider: result.provider });
  });
}
