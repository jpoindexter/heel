import type { DocumentDto } from "../../shared/api";
import type { Store } from "../store/store";
import { pdfPathFor } from "../store/documents";
import { fail, ok, type Result } from "../store/result";
import { documentHtml } from "./markdown";
import type { RenderResult } from "./renderer";

export type RenderPdf = (html: string, outPath: string) => Promise<RenderResult>;

/** The document's PDF, written next to its .md (made fresh each time: the .md is the source). */
export async function makePdf(store: Store, render: RenderPdf, id: string): Promise<Result<DocumentDto>> {
  const found = store.documents.get(id);
  if (!found.ok) return found;
  const body = store.documents.body(id);
  if (!found.value.path || body === null) return fail("conflict", "This document has no file on disk, so there is nothing to print.");
  const rendered = await render(documentHtml(found.value.title, body), pdfPathFor(found.value.path));
  if (!rendered.ok) return fail("conflict", rendered.error.message);
  return ok({ ...found.value, pdfPath: rendered.path });
}
