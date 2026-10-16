import { describe, expect, it } from "vitest";
import { testStore } from "./test-helpers";

const add = (store: ReturnType<typeof testStore>, title: string) => {
  const added = store.tasks.add({ title });
  if (!added.ok) throw new Error(added.error.message);
  return added.value;
};

describe("splitting a task", () => {
  it("adds the steps under the parent, right after it, all or none", () => {
    const store = testStore();
    const big = add(store, "Move the studio");
    add(store, "Something else");
    const split = store.split.apply(big.id, { titles: ["Book the van", "Pack the desks", "Tell the landlord"] });
    expect(split.ok && split.value.children.map((c) => [c.title, c.parentId])).toEqual([["Book the van", big.id], ["Pack the desks", big.id], ["Tell the landlord", big.id]]);
    expect(store.tasks.list().map((t) => t.title)).toEqual(["Move the studio", "Book the van", "Pack the desks", "Tell the landlord", "Something else"]);
    expect(store.split.children(big.id)).toHaveLength(3);
  });

  it("refuses a finished parent, a step of a step, and an empty or oversize list", () => {
    const store = testStore();
    const big = add(store, "Big");
    const split = store.split.apply(big.id, { titles: ["One", "Two"] });
    const child = split.ok ? split.value.children[0]! : null;
    expect(store.split.apply(child!.id, { titles: ["Deeper"] })).toMatchObject({ ok: false, error: { code: "conflict" } });
    expect(store.split.apply(big.id, { titles: [] })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(store.split.apply(big.id, { titles: Array.from({ length: 8 }, (_, i) => `s${i}`) })).toMatchObject({ ok: false, error: { code: "invalid" } });
    store.tasks.complete(big.id);
    expect(store.split.apply(big.id, { titles: ["Late"] })).toMatchObject({ ok: false, error: { code: "conflict" } });
  });

  it("unsplit drops the open steps and keeps finished ones on record", () => {
    const store = testStore();
    const big = add(store, "Big");
    const split = store.split.apply(big.id, { titles: ["One", "Two", "Three"] });
    if (!split.ok) throw new Error(split.error.message);
    store.tasks.complete(split.value.children[0]!.id);
    expect(store.split.undo(big.id)).toEqual({ ok: true, value: { count: 2 } });
    expect(store.tasks.list().map((t) => t.title)).toEqual(["Big"]);
    expect(store.tasks.list(["done"]).map((t) => t.title)).toEqual(["One"]);
  });
});
