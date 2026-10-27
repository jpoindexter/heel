import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchLayer } from "./SearchLayer";
import type { SearchState, useSearch } from "./useSearch";

const noop = () => undefined;
const search = (state: Partial<SearchState>): ReturnType<typeof useSearch> => ({ state: { query: "", hits: [], active: -1, searching: false, error: null, ...state }, setQuery: noop, move: noop, setActive: noop, refresh: noop });
const render = (state: Partial<SearchState>) => renderToStaticMarkup(<SearchLayer search={search(state)} active onPick={noop} onAsk={noop} />);

describe("SearchLayer", () => {
  it("shows a failed search as the error with Try again, never alongside 'nothing holds'", () => {
    const html = render({ query: "van", error: "The helper did not answer." });
    expect(html).toContain("The helper did not answer.");
    expect(html).toContain("Try again");
    expect(html).not.toContain("Nothing holds");
  });

  it("tells a veteran that nothing matched, echoing the word", () => {
    expect(render({ query: "van" })).toContain("Nothing holds “van”");
  });

  it("does not call a list of plain buttons a listbox", () => {
    expect(render({ query: "va", hits: [{ kind: "task", id: "t", text: "Van", detail: null, at: 0 }] })).not.toContain('role="listbox"');
  });
});
