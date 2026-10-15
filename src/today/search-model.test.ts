import { describe, expect, it } from "vitest";
import type { SearchHitDto } from "../../shared/api";
import { groupHits, hint, moveIndex } from "./search-model";

const hit = (kind: SearchHitDto["kind"], text: string): SearchHitDto => ({ kind, id: text, text, detail: null, at: 0 });

describe("search model", () => {
  it("groups hits by kind in list order, dropping empty groups", () => {
    const groups = groupHits([hit("said", "a"), hit("task", "b"), hit("task", "c"), hit("done", "d")]);
    expect(groups.map((g) => [g.label, g.hits.length])).toEqual([["Tasks", 2], ["Done", 1], ["Said", 1]]);
  });

  it("moves up and down with wrapping and starts from the ends", () => {
    expect(moveIndex(-1, 1, 3)).toBe(0);
    expect(moveIndex(-1, -1, 3)).toBe(2);
    expect(moveIndex(2, 1, 3)).toBe(0);
    expect(moveIndex(0, -1, 3)).toBe(2);
    expect(moveIndex(0, 1, 0)).toBe(-1);
  });

  it("says what to do before two letters and what was not found after", () => {
    expect(hint(" ")).toMatch(/Type to find/);
    expect(hint("zebra")).toBe("Nothing holds “zebra”. Try another word.");
  });
});
