import type { Hono } from "hono";
import type { AppDeps } from "./app";
import { ok } from "./respond";

/** One box over everything (N22): tasks, parked ideas, what was finished and what was said, ranked. */
export function registerSearchRoutes(app: Hono, { store }: AppDeps): void {
  app.get("/search", (c) => {
    const query = (c.req.query("q") ?? "").trim();
    return ok(c, { query, hits: store.search(query) });
  });
}
