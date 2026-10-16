import type { Hono } from "hono";
import { makePdf } from "../pdf/make-pdf";
import type { AppDeps } from "./app";
import { fail, ok } from "./respond";

/** Documents Heel wrote (N15): list, open or reveal the file on this Mac, make a PDF, delete (soft) and restore. Nothing is sent anywhere. */
export function registerDocumentsRoutes(app: Hono, { store, openFile, renderPdf }: AppDeps): void {
  app.get("/documents", (c) => ok(c, { documents: store.documents.list() }));

  /** Make (or remake) the PDF next to the .md and open it. */
  app.post("/documents/:id/pdf", async (c) => {
    const made = await makePdf(store, renderPdf, c.req.param("id"));
    if (!made.ok) return fail(c, made.error.code, made.error.message);
    const opened = made.value.pdfPath ? await openFile(made.value.pdfPath, false) : false;
    return ok(c, { document: made.value, opened });
  });

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
      const wantPdf = c.req.query("file") === "pdf";
      const path = wantPdf ? found.value.pdfPath : found.value.path;
      if (!path) return fail(c, "not_ready", wantPdf ? "There is no PDF of this document yet." : "This document has no file on disk (it was saved without a folder).");
      const opened = await openFile(path, reveal);
      return opened ? ok(c, { opened: true }) : fail(c, "failed", `Couldn't ${reveal ? "reveal" : "open"} ${path}.`);
    });
  }
}
