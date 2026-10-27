import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DocumentDto } from "../../shared/api";
import { DocumentsList } from "./DocumentsList";
import type { useDocuments } from "./useDocuments";

const doc = (id: string, title: string): DocumentDto => ({ id, title, path: `/tmp/${id}.md`, pdfPath: null, createdAt: 0 });
const noop = async () => undefined;
const list = (documents: DocumentDto[], problem: string | null = null) => ({ documents, problem, load: noop, open: noop, pdf: noop, remove: noop }) as unknown as ReturnType<typeof useDocuments>;

describe("DocumentsList", () => {
  it("names Open and Finder after the document, so a list of three is not three 'Open' buttons", () => {
    const html = renderToStaticMarkup(<DocumentsList documents={list([doc("a", "Plan"), doc("b", "Notes")])} />);
    expect(html).toContain('aria-label="Open: Plan"');
    expect(html).toContain('aria-label="Show in Finder: Plan"');
    expect(html).toContain('aria-label="Open: Notes"');
  });

  it("shows a failed load as the reason, not as no documents, and keeps the ones already shown", () => {
    const failed = renderToStaticMarkup(<DocumentsList documents={list([], "The helper did not answer.")} />);
    expect(failed).toContain('role="alert"');
    expect(failed).toContain("The helper did not answer.");
    const stale = renderToStaticMarkup(<DocumentsList documents={list([doc("a", "Plan")], "The helper did not answer.")} />);
    expect(stale).toContain('aria-label="Open: Plan"');
    expect(stale).toContain('role="alert"');
    expect(renderToStaticMarkup(<DocumentsList documents={list([])} />)).toBe("");
  });
});
