import { describe, expect, it } from "vitest";
import { afterListLoad, EMPTY_LIST, type ListState } from "./list-state";

const shown: ListState<string> = { items: ["Plan"], problem: null };
const refused = { ok: false as const, error: { code: "offline", message: "Not running." } };
const pick = (data: { names: string[] }) => data.names;

describe("afterListLoad", () => {
  it("keeps what was shown and names the problem when the reload fails", () => {
    expect(afterListLoad(shown, refused, pick)).toEqual({ items: ["Plan"], problem: "Not running." });
  });
  it("shows the problem, not an empty list, when the first load fails", () => {
    expect(afterListLoad(EMPTY_LIST, refused, pick)).toEqual({ items: [], problem: "Not running." });
  });
  it("takes the fresh list and clears the problem when it came", () => {
    expect(afterListLoad({ items: [], problem: "Not running." }, { ok: true, data: { names: ["Notes"] } }, pick)).toEqual({ items: ["Notes"], problem: null });
  });
});
