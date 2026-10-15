import type { Hono } from "hono";
import { z } from "zod";
import { PROVIDER_IDS } from "../../shared/providers";
import { detectAll } from "../agent/providers/registry";
import { BrainSettingsInput } from "../store/settings";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

const ProviderQuery = z.enum(PROVIDER_IDS);

/** Which AI Heel uses: the provider list, its models, saving the choice, and a connection test. */
export function registerBrainRoutes(app: Hono, deps: AppDeps): void {
  app.get("/brain", async (c) => ok(c, { settings: deps.store.settings.getBrain(), providers: await detectAll(deps.providers) }));

  app.get("/brain/models", async (c) => {
    const id = ProviderQuery.safeParse(c.req.query("provider"));
    if (!id.success) return fail(c, "invalid", `provider must be one of: ${PROVIDER_IDS.join(", ")}.`);
    const models = await deps.providers[id.data].models();
    return models.ok ? ok(c, { models: models.value }) : fail(c, models.error.code, models.error.message);
  });

  app.put("/brain", async (c) => {
    const body = BrainSettingsInput.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", body.error.issues[0]?.message ?? "Settings are not valid.");
    if (body.data.provider) {
      const status = await deps.providers[body.data.provider].status();
      if (!status.ready) return fail(c, "not_ready", status.detail);
    }
    const saved = deps.store.settings.setBrain(body.data);
    return saved.ok ? ok(c, saved.value) : fail(c, saved.error.code, saved.error.message);
  });

  app.post("/brain/test", async (c) => {
    const { provider, model } = deps.store.settings.getBrain();
    if (!provider) return fail(c, "not_ready", "Choose a provider first.");
    const status = await deps.providers[provider].status();
    if (!status.ready) return fail(c, "not_ready", status.detail);
    if (provider === "ollama" && !model) return fail(c, "not_ready", "Choose a local model first.");
    return ok(c, { detail: `${status.label} is ready: ${status.detail}.` });
  });
}
