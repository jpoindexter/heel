import { describe, expect, it } from "vitest";
import { SearchResultSchema, envelope } from "../../shared/api";
import { setup } from "./test-app";

const result = envelope(SearchResultSchema);

describe("GET /search", () => {
  it("returns ranked hits for a query and nothing for one letter", async () => {
    const { json, store } = setup();
    store.tasks.add({ title: "Pay the studio invoice", nowStep: null, source: "manual" });
    store.parked.park({ idea: "Invoice template", why: null });
    const found = result.parse(await json("/search?q=inv"));
    expect(found).toMatchObject({ ok: true, data: { query: "inv" } });
    if (found.ok) expect(found.data.hits.map((h) => [h.kind, h.text])).toEqual([["parked", "Invoice template"], ["task", "Pay the studio invoice"]]);
    const short = result.parse(await json("/search?q=i"));
    if (short.ok) expect(short.data.hits).toEqual([]);
    const none = result.parse(await json("/search"));
    if (none.ok) expect(none.data).toEqual({ query: "", hits: [] });
  });
});
