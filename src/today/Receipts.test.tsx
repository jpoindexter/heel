import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Receipts } from "./Receipts";
import type { Receipt } from "./thread-model";

const receipt = (text: string, extra: Partial<Receipt> = {}): Receipt => ({ ok: true, text, undo: { kind: "drop_task", id: "t1" }, undone: false, ...extra });

describe("Receipts", () => {
  it("names each Undo and Open after its own line, so two receipts never read as the same button", () => {
    const html = renderToStaticMarkup(<Receipts receipts={[receipt("Added: Book the van"), receipt("Wrote plan.md", { document: "d1" })]} onUndo={() => undefined} onOpen={() => undefined} />);
    expect(html).toContain('aria-label="Undo: Added: Book the van"');
    expect(html).toContain('aria-label="Undo: Wrote plan.md"');
    expect(html).toContain('aria-label="Open: Wrote plan.md"');
  });
});
