import { Hono } from "hono";
import { ok } from "./respond";
import type { Provider, ProviderId } from "../agent/providers/types";
import type { Store } from "../store/store";
import { registerBrainRoutes } from "./brain-routes";
import { applyGuards } from "./guards";
import { registerFocusRoutes } from "./focus-routes";
import { registerMessagesRoutes } from "./messages-routes";
import { registerTodayRoutes } from "./today-routes";

export type AppDeps = {
  store: Store;
  providers: Record<ProviderId, Provider>;
  token: string;
  /** Browser origins allowed to call the server (the panel's webview). */
  allowedOrigins: readonly string[];
};

export const DEV_ORIGIN = "http://localhost:1420";
export const TAURI_ORIGINS = ["tauri://localhost", "http://tauri.localhost"] as const;

export function createApp(deps: AppDeps) {
  const app = new Hono();
  applyGuards(app, { token: deps.token, allowedOrigins: deps.allowedOrigins });
  app.get("/health", (c) => ok(c, { status: "ok" }));
  registerBrainRoutes(app, deps);
  registerTodayRoutes(app, deps);
  registerFocusRoutes(app, deps);
  registerMessagesRoutes(app, deps);
  return app;
}
