import type { Hono } from "hono";
import type { AppDeps } from "./app";
import { fail, ok } from "./respond";

/** Documents Heel wrote (N15): list, open or reveal the file on this Mac, delete (soft) and restore. Nothing is sent anywhere. */
export function registerDocumentsRoutes(app: Hono, { store, openFile }: AppDeps): void {
  app.get("/documents", (c) => ok(c, { documents: store.documents.list() }));

  app.post("/documents/:id/delete", (c) => {
    const result = store.documents.remove(c.req.param("id"));
    return result.ok ? ok(c, { document: result.value }) : fail(c, result.error.code, result.error.message);
  });

  app.post("/documents/:id/restore", (c) => {
    const result = store.documents.restore(c.req.param("id"));
    return result.ok ? ok(c, { document: result.value }) : fail(c, result.error.code, result.error.message);
  });

  for (const [route, reveal] of [["open", false], ["reveal", true]] as const) {
    app.post(`/documents/:id/${route}`, async (c) => {
      const found = store.documents.get(c.req.param("id"));
      if (!found.ok) return fail(c, found.error.code, found.error.message);
      if (!found.value.path) return fail(c, "not_ready", "This document has no file on disk (it was saved without a folder).");
      const opened = await openFile(found.value.path, reveal);
      return opened ? ok(c, { opened: true }) : fail(c, "failed", `Couldn't ${reveal ? "reveal" : "open"} ${found.value.path}.`);
    });
  }
}
