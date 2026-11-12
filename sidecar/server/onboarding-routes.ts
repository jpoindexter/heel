import type { Hono } from "hono";
import { z } from "zod";
import { OnboardingStepSchema } from "../../shared/onboarding";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

export function registerOnboardingRoutes(app: Hono, { store }: AppDeps) {
  app.get("/onboarding", c => ok(c, store.onboarding.get()));
  app.put("/onboarding", async c => {
    const body = z.object({ step: OnboardingStepSchema }).safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", "Choose a setup step from 0 to 3.");
    const saved = store.onboarding.move(body.data.step);
    return saved.ok ? ok(c, saved.value) : fail(c, saved.error.code, saved.error.message);
  });
  app.post("/onboarding/task", async c => {
    const body = z.object({ title: z.string() }).safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", "Write one thing for Heel to remember.");
    const saved = store.onboarding.capture(body.data.title);
    return saved.ok ? ok(c, saved.value) : fail(c, saved.error.code, saved.error.message);
  });
}
