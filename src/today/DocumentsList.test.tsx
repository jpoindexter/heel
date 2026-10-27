import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DocumentDto } from "../../shared/api";
import { DocumentsList } from "./DocumentsList";
import type { useDocuments } from "./useDocuments";

const doc = (id: string, title: string): DocumentDto => ({ id, title, path: `/tmp/${id}.md`, pdfPath: null, createdAt: 0 });
const noop = async () => undefined;

describe("DocumentsList", () => {
  it("names Open and Finder after the document, so a list of three is not three 'Open' buttons", () => {
    const documents = { documents: [doc("a", "Plan"), doc("b", "Notes")], load: noop, open: noop, pdf: noop, remove: noop } as unknown as ReturnType<typeof useDocuments>;
    const html = renderToStaticMarkup(<DocumentsList documents={documents} />);
    expect(html).toContain('aria-label="Open: Plan"');
    expect(html).toContain('aria-label="Show in Finder: Plan"');
    expect(html).toContain('aria-label="Open: Notes"');
  });
});
