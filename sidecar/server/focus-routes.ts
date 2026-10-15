import type { Hono } from "hono";
import { EndFocusInputSchema, SpendInputSchema, StartFocusInputSchema } from "../../shared/api";
import { rangeFor } from "../../shared/focus";
import { effectiveStartedAt } from "../../shared/pomodoro";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

/** Time-boxes and the interrupt budget: what the panel and Greg's window call. */
export function registerFocusRoutes(app: Hono, deps: AppDeps): void {
  const { store } = deps;

  /** A running Pomodoro work phase counts as the active focus, so Greg's pose and the quiet rules follow it without a session row. */
  const activeFocus = () => {
    const session = store.focus.active();
    if (session) return session;
    const { state } = store.pomodoro.read();
    if (!state || state.phase !== "work" || state.waiting) return null;
    const min = state.phaseMin;
    return { id: "pomodoro", goal: state.goal, taskId: state.taskId, bestMin: min, realisticMin: min, worstMin: min, startedAt: effectiveStartedAt(state, store.now()), endedAt: null, outcome: null };
  };

  app.get("/focus", (c) => ok(c, { focus: activeFocus() }));

  app.post("/focus/start", async (c) => {
    const body = StartFocusInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"goal": "...", "realisticMin": 25}.');
    const { goal, taskId, realisticMin } = body.data;
    const started = store.focus.start({ goal, taskId, ...rangeFor(realisticMin) });
    return started.ok ? ok(c, { focus: started.value }) : fail(c, started.error.code, started.error.message);
  });

  app.post("/focus/:id/end", async (c) => {
    const body = EndFocusInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"outcome": "done"} (continued, parked_and_returned, done or abandoned).');
    const ended = store.focus.end(c.req.param("id"), body.data.outcome);
    return ended.ok ? ok(c, { focus: ended.value }) : fail(c, ended.error.code, ended.error.message);
  });

  app.get("/interrupts", (c) => ok(c, store.interrupts.state()));

  app.post("/interrupts/spend", async (c) => {
    const body = SpendInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"reason": "focus-end:<id>"}.');
    const spent = store.interrupts.spend(body.data.reason);
    return spent.ok ? ok(c, spent.value) : fail(c, spent.error.code, spent.error.message);
  });
}
