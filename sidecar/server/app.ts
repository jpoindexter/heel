import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { PROVIDER_IDS } from "../../shared/providers";
import { TOKEN_HEADER } from "../../shared/api";
import { detectAll } from "../agent/providers/registry";
import type { Provider, ProviderId } from "../agent/providers/types";
import { BrainSettingsInput } from "../store/settings";
import type { Store } from "../store/store";
import { fail, ok, readJson } from "./respond";
import { registerTodayRoutes } from "./today-routes";

export type AppDeps = {
  store: Store;
  providers: Record<ProviderId, Provider>;
  token: string;
  /** Browser origins allowed to call the server (the panel's webview). */
  allowedOrigins: readonly string[];
};

/** Only loopback hostnames may reach the server; stops DNS-rebinding from a web page. */
const LOOPBACK_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;

export const DEV_ORIGIN = "http://localhost:1420";
export const TAURI_ORIGINS = ["tauri://localhost", "http://tauri.localhost"] as const;

const ProviderQuery = z.enum(PROVIDER_IDS);

function tokenMatches(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createApp(deps: AppDeps) {
  const app = new Hono();

  app.use("*", async (c, next) => {
    if (!LOOPBACK_HOST.test(c.req.header("host") ?? "")) return c.json({ error: "Forbidden host." }, 403);
    await next();
  });

  app.use(
    "*",
    cors({
      origin: (origin) => (deps.allowedOrigins.includes(origin) ? origin : null),
      allowHeaders: ["content-type", TOKEN_HEADER],
      allowMethods: ["GET", "PUT", "POST", "OPTIONS"],
    }),
  );

  app.use("*", async (c, next) => {
    if (!tokenMatches(c.req.header(TOKEN_HEADER), deps.token)) return c.json({ error: "Missing or wrong token." }, 401);
    await next();
  });

  app.get("/health", (c) => ok(c, { status: "ok" }));

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

  registerTodayRoutes(app, deps);

  return app;
}
