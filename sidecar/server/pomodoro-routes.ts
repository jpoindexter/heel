import type { Hono } from "hono";
import { z } from "zod";
import { PomodoroConfigSchema, remainingMs } from "../../shared/pomodoro";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

const StartInput = z.object({ goal: z.string().trim().min(1, "Say what the work is about.").max(500), taskId: z.string().nullable().default(null) });
const MOVES = ["pause", "resume", "skip", "next", "stop"] as const;

/** Pomodoro (N18): one state row the helper advances by the wall clock; the panel only asks and presses buttons. */
export function registerPomodoroRoutes(app: Hono, { store }: AppDeps): void {
  const view = () => {
    const read = store.pomodoro.read();
    return { ...read, remainingMs: read.state ? remainingMs(read.state, store.now()) : 0 };
  };

  app.get("/pomodoro", (c) => ok(c, view()));

  app.post("/pomodoro/start", async (c) => {
    const body = StartInput.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", body.error.issues[0]?.message ?? 'Send {"goal": "...", "taskId": null}.');
    const started = store.pomodoro.start(body.data.goal, body.data.taskId);
    return started.ok ? ok(c, view()) : fail(c, started.error.code, started.error.message);
  });

  app.post("/pomodoro/:move", (c) => {
    const move = c.req.param("move");
    if (!(MOVES as readonly string[]).includes(move)) return fail(c, "invalid", `Move must be one of: ${MOVES.join(", ")}.`);
    const moved = store.pomodoro.move(move as (typeof MOVES)[number]);
    return moved.ok ? ok(c, view()) : fail(c, moved.error.code, moved.error.message);
  });

  app.put("/pomodoro/config", async (c) => {
    const body = PomodoroConfigSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", body.error.issues[0]?.message ?? "Lengths must be whole minutes.");
    const saved = store.pomodoro.setConfig(body.data);
    return saved.ok ? ok(c, saved.value) : fail(c, saved.error.code, saved.error.message);
  });
}
