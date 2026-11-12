import type { Applications } from "../applications/service";
import { registerApplicationRoutes } from "./application-routes";
import { registerOnboardingRoutes } from "./onboarding-routes";
import { Hono } from "hono";
import { ok } from "./respond";
import type { Provider, ProviderId } from "../agent/providers/types";
import type { AppsSource } from "../apps/source";
import type { InboxService } from "../inbox/service";
import type { MailSource } from "../mail/source";
import type { Store } from "../store/store";
import { registerAppsRoutes } from "./apps-routes";
import { registerAttentionRoutes } from "./attention-routes";
import { registerBrainRoutes } from "./brain-routes";
import { registerDataRoutes } from "./data-routes";
import { registerDebugRoutes, type DebugDeps } from "./debug-routes";
import { applyGuards } from "./guards";
import { registerFocusRoutes } from "./focus-routes";
import { registerInboxRoutes } from "./inbox-routes";
import { registerMailRoutes } from "./mail-routes";
import { registerMethodRoutes } from "./method-routes";
import { registerPomodoroRoutes } from "./pomodoro-routes";
import { registerMessagesRoutes } from "./messages-routes";
import type { RenderPdf } from "../pdf/make-pdf";
import type { SkillsService } from "../agent/skills";
import { registerSkillsRoutes } from "./skills-routes";
import { registerDocumentsRoutes } from "./documents-routes";
import { registerSearchRoutes } from "./search-routes";
import { registerSplitRoutes } from "./split-routes";
import { registerTodayRoutes, registerTurnRoute } from "./today-routes";

export type AppDeps = {
  store: Store;
  applications?: Applications;
  providers: Record<ProviderId, Provider>;
  inbox: InboxService;
  /** Apple Mail on this Mac. */
  mail: MailSource;
  /** Mail.app exists here (checked once at start, without touching Mail). */
  mailAvailable: boolean;
  /** Calendar, Reminders and Notes on this Mac (N26). */
  apps: AppsSource;
  token: string;
  /** Browser origins allowed to call the server (the panel's webview). */
  allowedOrigins: readonly string[];
  /** Open a file in its app, or reveal it in Finder (N15). Resolves false when the Mac refused. */
  openFile: (path: string, reveal: boolean) => Promise<boolean>;
  /** Render a page of HTML to a PDF file on this Mac (N15). */
  renderPdf: RenderPdf;
  /** The skills the agent reads: bundled and your own (N3). */
  skills: SkillsService;
  /** Facts for Settings > Debug (N30). */
  debug: DebugDeps;
};

export const DEV_ORIGIN = "http://localhost:1420";
export const TAURI_ORIGINS = ["tauri://localhost", "http://tauri.localhost"] as const;

export function createApp(deps: AppDeps) {
  const app = new Hono();
  applyGuards(app, { token: deps.token, allowedOrigins: deps.allowedOrigins });
  app.get("/health", (c) => ok(c, { status: "ok" }));
  registerBrainRoutes(app, deps);
  registerOnboardingRoutes(app, deps);
  registerApplicationRoutes(app, deps);
  // Before the today routes: their `/tasks/:id/:action` would otherwise swallow `/tasks/:id/split` and `/unsplit`.
  registerSplitRoutes(app, deps);
  registerTodayRoutes(app, deps);
  registerTurnRoute(app, deps);
  registerFocusRoutes(app, deps);
  registerMessagesRoutes(app, deps);
  registerInboxRoutes(app, deps);
  registerMailRoutes(app, deps);
  registerAppsRoutes(app, deps);
  registerMethodRoutes(app, deps);
  registerPomodoroRoutes(app, deps);
  registerAttentionRoutes(app, deps);
  registerSearchRoutes(app, deps);
  registerDocumentsRoutes(app, deps);
  registerSkillsRoutes(app, deps);
  registerDebugRoutes(app, deps);
  registerDataRoutes(app, deps);
  return app;
}
