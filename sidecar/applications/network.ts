import { createHash, randomUUID } from "node:crypto";
import type { BrowserContext, Route } from "playwright-core";
import type { PendingRequest } from "../../shared/applications";
import { redactJson, safeUrl, safeValue } from "./privacy";

export const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
type Held = { view: PendingRequest; route: Route; timer: ReturnType<typeof setTimeout> };

async function bodyPreview(route: Route): Promise<string> {
  const req = route.request(), buffer = req.postDataBuffer();
  if (!buffer) return "No request body";
  const type = req.headers()["content-type"] ?? "";
  if (type.includes("multipart/form-data")) {
    const form = await new Response(Uint8Array.from(buffer), { headers: { "content-type": type } }).formData();
    return Array.from(form.entries()).map(([key, value]) => `${key}: ${typeof value === "string" ? safeValue(key, value) : `${value.name} (${value.size} bytes)`}`).join("\n");
  }
  if (buffer.length > 40_000) throw new Error("This site request is too large to review as text.");
  if (/json/.test(type)) return JSON.stringify(redactJson(JSON.parse(buffer.toString("utf8"))), null, 2);
  if (/x-www-form-urlencoded/.test(type)) return Array.from(new URLSearchParams(buffer.toString("utf8"))).map(([key, value]) => `${key}: ${safeValue(key, value)}`).join("\n");
  throw new Error("This site request has a format Heel cannot preview safely.");
}

/** Hold the exact browser request; approval never means replaying a guessed URL or payload. */
export class RequestGate {
  readonly held = new Map<string, Held>();
  stage = false;
  closed = false;
  problem: string | null = null;
  constructor(private changed: () => void, private allowed: (url: string) => Promise<void>) {}
  views() { return [...this.held.values()].map(h => h.view); }
  navigating() { return [...this.held.values()].some(h => h.route.request().isNavigationRequest()); }

  async install(context: BrowserContext) {
    await context.routeWebSocket("**/*", socket => socket.close());
    await context.route("**/*", route => this.intercept(route));
  }

  private async intercept(route: Route) {
    const request = route.request();
    try {
      await this.allowed(request.url());
      const read = ["GET", "HEAD", "OPTIONS"].includes(request.method());
      const staged = this.stage && ["document", "xhr", "fetch"].includes(request.resourceType());
      if (!read || staged) return await this.hold(route);
      await this.release(route);
    } catch {
      this.problem = "A site request was blocked or failed. Check the browser and refresh; Heel did not grant permission to retry it.";
      this.changed(); await route.abort().catch(() => {});
    }
  }

  private async hold(route: Route) {
    if (this.closed || this.held.size >= 8) return route.abort();
    const request = route.request();
    const body = await bodyPreview(route);
    if (body.length > 40_000) throw new Error("This request exceeds the preview limit. Finish it manually in the browser.");
    const view = { id: randomUUID(), url: safeUrl(request.url()), method: request.method(), body, sha256: digest(`${request.method()} ${request.url()}\n${request.postDataBuffer()?.toString("base64") ?? ""}`) };
    const timer = setTimeout(() => { void this.reject(view.id); }, 5 * 60_000);
    timer.unref();
    this.held.set(view.id, { view, route, timer });
    this.changed();
  }

  async approve(id: string) {
    const held = this.held.get(id);
    if (!held) throw new Error("That request expired or was already used. Review the form again.");
    this.held.delete(id);
    clearTimeout(held.timer);
    // Consume before the effect. The service persists this state before calling us.
    return this.release(held.route);
  }

  private async release(route: Route) {
    const response = await route.fetch({ maxRedirects: 0, timeout: 30_000 });
    const location = response.headers()["location"];
    if (location) {
      await this.allowed(new URL(location, response.url()).href);
      if ([307, 308].includes(response.status()) && !["GET", "HEAD"].includes(route.request().method())) {
        await route.abort();
        throw new Error("The site redirects this write. Check its status before trying again.");
      }
    }
    await route.fulfill({ response });
    return response.status();
  }

  async reject(id: string) {
    const held = this.held.get(id);
    if (!held) return;
    clearTimeout(held.timer);
    this.held.delete(id);
    await held.route.abort().catch(() => {});
    this.changed();
  }

  async close() {
    this.closed = true;
    await Promise.all([...this.held.keys()].map(id => this.reject(id)));
  }
}
