import type { Hono } from "hono";
import { z } from "zod";
import { ProviderKeyForgetSchema, ProviderKeyInputSchema } from "../../shared/api";
import { PROVIDER_IDS } from "../../shared/providers";
import { cachedDetectAll } from "../agent/providers/registry";
import { isKeyedProvider } from "../agent/providers/types";
import { BrainSettingsInput } from "../store/settings";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

const ProviderQuery = z.enum(PROVIDER_IDS);

/** Which AI Heel uses: the provider list, its models, saving the choice, and a connection test. */
export function registerBrainRoutes(app: Hono, deps: AppDeps): void {
  const statuses = cachedDetectAll(deps.providers);
  registerKeyRoutes(app, deps, statuses);
  app.get("/brain", async (c) => ok(c, { settings: deps.store.settings.getBrain(), providers: await statuses.all() }));

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
      statuses.forget();
      const status = await deps.providers[body.data.provider].status();
      if (!status.ready) return fail(c, "not_ready", status.detail);
    }
    const saved = deps.store.settings.setBrain(body.data);
    return saved.ok ? ok(c, saved.value) : fail(c, saved.error.code, saved.error.message);
  });

  app.post("/brain/test", async (c) => {
    const { provider, model } = deps.store.settings.getBrain();
    if (!provider) return fail(c, "not_ready", "Choose a provider first.");
    statuses.forget();
    const status = await deps.providers[provider].status();
    if (!status.ready) return fail(c, "not_ready", status.detail);
    if (provider === "ollama" && !model) return fail(c, "not_ready", "Choose a local model first.");
    return ok(c, { detail: `${status.label} is ready: ${status.detail}.` });
  });
}

/** An API key (V1-9): tried against the provider, then kept in the Keychain; never echoed back, never in the database. */
function registerKeyRoutes(app: Hono, deps: AppDeps, statuses: ReturnType<typeof cachedDetectAll>): void {
  app.put("/brain/key", async (c) => {
    const body = ProviderKeyInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", body.error.issues[0]?.message ?? "Send {\"provider\", \"key\"}.");
    const provider = deps.providers[body.data.provider];
    if (!isKeyedProvider(provider)) return fail(c, "invalid", `${provider.label} doesn't take an API key.`);
    const saved = await provider.saveKey(body.data.key);
    statuses.forget();
    return saved.ok ? ok(c, saved.value) : fail(c, saved.error.code, saved.error.message);
  });

  app.post("/brain/key/forget", async (c) => {
    const body = ProviderKeyForgetSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", "Send {\"provider\"}.");
    const provider = deps.providers[body.data.provider];
    if (!isKeyedProvider(provider)) return fail(c, "invalid", `${provider.label} doesn't take an API key.`);
    statuses.forget();
    return ok(c, await provider.forgetKey());
  });
}
