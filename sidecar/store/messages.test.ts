import { describe, expect, it } from "vitest";
import type { StoredMessage } from "../../shared/api";
import { MESSAGE_RETENTION_DAYS } from "./messages";
import { openStore } from "./store";

const DAY = 24 * 60 * 60 * 1000;
const user = (id: number, text: string): StoredMessage => ({ id, role: "user", text });
const said = (id: number, say: string): StoredMessage => ({ id, role: "heel", status: "said", say, receipts: [{ ok: true, text: "Added", undo: { kind: "drop_task", id: "t1" }, undone: false }] });

function clockStore(start = Date.UTC(2026, 9, 15, 12)) {
  let now = start;
  return { store: openStore({ now: () => now }), advance: (ms: number) => (now += ms) };
}

describe("messages", () => {
  it("keeps the conversation in order and says which id comes next", () => {
    const { store } = clockStore();
    store.messages.save(user(1, "plan"));
    store.messages.save(said(2, "Start with email."));
    expect(store.messages.list()).toEqual({ messages: [user(1, "plan"), said(2, "Start with email.")], nextId: 3 });
  });

  it("updates a message in place, e.g. when a receipt is undone", () => {
    const { store } = clockStore();
    store.messages.save(said(2, "x"));
    const undone = { ...said(2, "x"), receipts: [{ ok: true, text: "Added", undo: null, undone: true }] } as StoredMessage;
    store.messages.save(undone);
    expect(store.messages.list().messages).toEqual([undone]);
  });

  it("rejects a message it cannot read back, without storing anything", () => {
    const { store } = clockStore();
    expect(store.messages.save({ id: 1, role: "heel", status: "pending" })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(store.messages.list().messages).toEqual([]);
  });

  it("clear hides everything and restore brings back exactly that clear", () => {
    const { store, advance } = clockStore();
    store.messages.save(user(1, "a"));
    store.messages.save(user(2, "b"));
    const cleared = store.messages.clear();
    expect(cleared.count).toBe(2);
    expect(store.messages.list().messages).toEqual([]);
    advance(1000);
    store.messages.save(user(3, "after"));
    expect(store.messages.restore(cleared.clearedAt!)).toEqual({ count: 2 });
    expect(store.messages.list().messages.map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it("clearing an empty conversation says so, and ids still never repeat", () => {
    const { store } = clockStore();
    expect(store.messages.clear()).toEqual({ clearedAt: null, count: 0 });
    store.messages.save(user(7, "x"));
    store.messages.clear();
    expect(store.messages.list().nextId).toBe(8);
  });

  it("deletes chat text older than the retention period, cleared or not", () => {
    const { store, advance } = clockStore();
    store.messages.save(user(1, "old"));
    store.messages.clear();
    advance((MESSAGE_RETENTION_DAYS + 1) * DAY);
    store.messages.save(user(2, "new"));
    expect(store.messages.list().messages.map((m) => m.id)).toEqual([2]);
    expect(store.messages.restore(1)).toEqual({ count: 0 });
  });
});
