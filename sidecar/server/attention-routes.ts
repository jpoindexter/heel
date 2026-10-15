import type { Hono } from "hono";
import { AttentionSampleSchema, AttentionSettingsSchema } from "../../shared/api";
import { effectiveStartedAt } from "../../shared/pomodoro";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

/** Attention sense (N24): the switch and the wander list, the day's seconds per app, and the samples the shell sends. */
export function registerAttentionRoutes(app: Hono, { store }: AppDeps): void {
  const view = () => ({ settings: store.settings.getAttention(), day: store.attention.day() });

  app.get("/attention", (c) => ok(c, view()));

  app.put("/attention/settings", async (c) => {
    const body = AttentionSettingsSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", body.error.issues[0]?.message ?? 'Send {"enabled": false, "wanderBundles": ["com.apple.Safari"]}.');
    const saved = store.settings.setAttention(body.data);
    return saved.ok ? ok(c, saved.value) : fail(c, saved.error.code, saved.error.message);
  });

  /** One sample from the shell. The box, the Now task and the wander list come from the helper; quiet comes from the panel. */
  app.post("/attention/sample", async (c) => {
    const body = AttentionSampleSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"bundle": "...", "name": "...", "idleSec": 0, "intervalSec": 5, "quiet": false}.');
    const { quiet, at, ...rest } = body.data;
    const sample = { ...rest, at: at ?? store.now() };
    const session = store.focus.active();
    const cycle = store.pomodoro.read().state;
    const box = session
      ? { goal: session.goal, startedAt: session.startedAt, realisticMin: session.realisticMin, worstMin: session.worstMin }
      : cycle && cycle.phase === "work" && !cycle.waiting
        ? { goal: cycle.goal, startedAt: effectiveStartedAt(cycle, store.now()), realisticMin: cycle.phaseMin, worstMin: cycle.phaseMin }
        : null;
    const nowTask = store.tasks.list()[0]?.title ?? null;
    const nudge = store.attention.fold(sample, { box, quiet, nowTask, wanderBundles: store.settings.getAttention().wanderBundles });
    return ok(c, { nudge });
  });
}
