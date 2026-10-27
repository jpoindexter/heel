import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { HistoryDto } from "../../shared/api";
import { createClient } from "../api/client";
import { AttentionProvider } from "../ui/attention";
import { HistoryLayer } from "./HistoryLayer";
import type { useDocuments } from "./useDocuments";
import type { useHistory } from "./useHistory";

const noop = async () => undefined;
const client = createClient({ readInfo: async () => null });
const documents = { documents: [], problem: null, load: noop, open: noop, pdf: noop, remove: noop } as unknown as ReturnType<typeof useDocuments>;
const history = (state: ReturnType<typeof useHistory>["state"]): ReturnType<typeof useHistory> => ({ state, load: noop, restore: noop });

const render = (state: ReturnType<typeof useHistory>["state"]) =>
  renderToStaticMarkup(
    <AttentionProvider client={client}>
      <HistoryLayer history={history(state)} documents={documents} today="2026-10-27" />
    </AttentionProvider>,
  );

const done: HistoryDto = { week: [], days: [{ date: "2026-10-27", count: 2, tasks: [{ id: "a", title: "Book the van", completedAt: 1 }, { id: "b", title: "Email Aoi", completedAt: 2 }] }] } as unknown as HistoryDto;

describe("HistoryLayer", () => {
  it("names each Restore after its task, so a day of five is not five 'Restore' buttons", () => {
    const html = render({ phase: "ready", history: done, error: null });
    expect(html).toContain('aria-label="Restore: Book the van"');
    expect(html).toContain('aria-label="Restore: Email Aoi"');
    expect(html).not.toContain('role="alert"');
  });

  it("keeps the month on screen and says why when a Restore is refused", () => {
    const html = render({ phase: "ready", history: done, error: "The helper did not answer." });
    expect(html).toContain('role="alert"');
    expect(html).toContain("The helper did not answer.");
    expect(html).toContain('aria-label="Restore: Book the van"');
    expect(html).not.toContain("Try again");
  });

  it("shows a failed load as the message with Try again, not as an empty month", () => {
    const html = render({ phase: "error", message: "The helper did not answer." });
    expect(html).toContain("The helper did not answer.");
    expect(html).toContain("Try again");
    expect(html).not.toContain("Nothing finished");
  });
});
