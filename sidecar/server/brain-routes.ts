import type { Hono } from "hono";
import { ProviderKeyForgetSchema, ProviderKeyInputSchema } from "../../shared/api";
import { cachedDetectAll, withModels } from "../agent/providers/registry";
import { isKeyedProvider } from "../agent/providers/types";
import { BrainSettingsInput } from "../store/settings";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

/** Long enough for a CLI to start and answer one word; the panel shows "Testing…" meanwhile. */
const TEST_TIMEOUT_MS = 60_000;
const TEST_SYSTEM = "This is a connection test. Reply with the single word OK and nothing else.";

/** Which AI Heel uses: the provider list with each one's models, saving the choice, and a connection test. */
export function registerBrainRoutes(app: Hono, deps: AppDeps): void {
  const statuses = cachedDetectAll(deps.providers);
  registerKeyRoutes(app, deps, statuses);
  // ?fresh=1 is the panel's "Check again": skip the 30 s cache so a sign-in just done shows at once.
  app.get("/brain", async (c) => {
    if (c.req.query("fresh")) statuses.forget();
    return ok(c, { settings: deps.store.settings.getBrain(), providers: await statuses.all() });
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
    // A real one-word completion: "signed in" alone has let a broken model name or a dead key pass as green.
    const started = Date.now();
    const reply = await deps.providers[provider].complete({ system: TEST_SYSTEM, prompt: "OK?", model, timeoutMs: TEST_TIMEOUT_MS });
    if (!reply.ok) return fail(c, reply.error.code, reply.error.message);
    return ok(c, { detail: `${status.label} answered in ${((Date.now() - started) / 1000).toFixed(1)} s.` });
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
    return saved.ok ? ok(c, await withModels(provider, saved.value)) : fail(c, saved.error.code, saved.error.message);
  });

  app.post("/brain/key/forget", async (c) => {
    const body = ProviderKeyForgetSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", "Send {\"provider\"}.");
    const provider = deps.providers[body.data.provider];
    if (!isKeyedProvider(provider)) return fail(c, "invalid", `${provider.label} doesn't take an API key.`);
    statuses.forget();
    return ok(c, await withModels(provider, await provider.forgetKey()));
  });
}
