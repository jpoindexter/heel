import { describe, expect, it } from "vitest";
import type { Hit } from "./search";
import { matchScore, rank } from "./search";
import { testStore } from "./test-helpers";

const hit = (kind: Hit["kind"], text: string, at: number, detail: string | null = null): Hit => ({ kind, id: `${kind}-${text}`, text, detail, at });

describe("ranking", () => {
  it("scores the start of the text over the start of a word over anywhere, and misses as nothing", () => {
    expect(matchScore("inv", "Invoice the studio")).toBe(3);
    expect(matchScore("inv", "Pay the invoice")).toBe(2);
    expect(matchScore("voi", "Pay the invoice")).toBe(1);
    expect(matchScore("tax", "Pay the invoice")).toBe(0);
    expect(matchScore("inv", null)).toBe(0);
  });

  it("puts a title match above a body match, open above finished, and newer above older", () => {
    const hits = rank("inv", [
      hit("done", "Invoice March", 50),
      hit("task", "Call the bank", 10, "about the invoice"),
      hit("task", "Invoice April", 20),
      hit("parked", "Invoice automation", 30),
      hit("task", "Invoice May", 40),
      hit("said", "Send the invoice", 60),
    ]);
    expect(hits.map((h) => h.text)).toEqual(["Invoice May", "Invoice April", "Invoice automation", "Invoice March", "Send the invoice", "Call the bank"]);
  });
});

describe("search", () => {
  it("finds tasks, parked ideas, finished tasks and what was said, and needs two letters", () => {
    const store = testStore();
    store.tasks.add({ title: "Pay the studio invoice", nowStep: null, source: "manual" });
    const done = store.tasks.add({ title: "Invoice draft", nowStep: null, source: "manual" });
    if (done.ok) store.tasks.complete(done.value.id);
    store.parked.park({ idea: "An invoice template", why: null });
    store.messages.save({ id: 1, role: "user", text: "where is the invoice?" });
    const hits = store.search("inv");
    // "Invoice draft" starts with the query, so it leads even though it is finished; the rest tie and fall in kind order.
    expect(hits.map((h) => h.kind)).toEqual(["done", "task", "parked", "said"]);
    expect(store.search("i")).toEqual([]);
    expect(store.search("%")).toEqual([]);
  });
});
