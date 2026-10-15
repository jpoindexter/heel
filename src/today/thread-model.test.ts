import { describe, expect, it } from "vitest";
import { MAX_HISTORY_MESSAGES } from "../../shared/api";
import { NEAR_BOTTOM_PX, historyFor, isNearBottom, receiptSummary, toReceipts, type Message } from "./thread-model";

describe("toReceipts", () => {
  it("keeps success text, prefixes failures, and carries the undo", () => {
    const receipts = toReceipts([
      { type: "add_task", ok: true, message: 'Added "Ship".', undo: { kind: "drop_task", id: "a" } },
      { type: "complete_task", ok: false, message: 'Unknown task "t9".' },
    ]);
    expect(receipts).toEqual([
      { ok: true, text: 'Added "Ship".', undo: { kind: "drop_task", id: "a" }, undone: false },
      { ok: false, text: `Couldn't: Unknown task "t9".`, undo: null, undone: false },
    ]);
  });
});

describe("receiptSummary", () => {
  const r = (ok: boolean) => ({ ok, text: "x", undo: null, undone: false });
  it("counts in words", () => {
    expect(receiptSummary([r(true)]).text).toBe("1 thing done");
    expect(receiptSummary([r(true), r(true)]).text).toBe("2 things done");
  });
  it("never hides a failure", () => {
    expect(receiptSummary([r(true), r(false)])).toEqual({ text: "1 thing done · 1 couldn't be done", hasFailure: true });
    expect(receiptSummary([r(false)])).toEqual({ text: "1 couldn't be done", hasFailure: true });
  });
});

describe("historyFor", () => {
  const user = (id: number, text: string): Message => ({ id, role: "user", text });
  const said = (id: number, say: string): Message => ({ id, role: "heel", status: "said", say, receipts: [] });

  it("replays said turns in order and skips pending and failed ones", () => {
    const messages: Message[] = [
      user(1, "plan"),
      said(2, "Start with email."),
      user(3, "again"),
      { id: 4, role: "heel", status: "failed", message: "timeout", offerSettings: false, retryText: "again" },
      user(5, "again"),
      { id: 6, role: "heel", status: "pending" },
    ];
    expect(historyFor(messages)).toEqual([
      { role: "user", text: "plan" },
      { role: "heel", text: "Start with email." },
      { role: "user", text: "again" },
      { role: "user", text: "again" },
    ]);
  });

  it("keeps only the most recent messages the helper accepts", () => {
    const messages = Array.from({ length: 20 }, (_, i) => user(i, `m${i}`));
    const history = historyFor(messages);
    expect(history).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(history.at(-1)!.text).toBe("m19");
  });
});

describe("isNearBottom", () => {
  it("is true within the threshold and false once the person has scrolled up", () => {
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 600, clientHeight: 400 })).toBe(true);
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 600 - NEAR_BOTTOM_PX, clientHeight: 400 })).toBe(true);
    expect(isNearBottom({ scrollHeight: 1000, scrollTop: 500, clientHeight: 400 })).toBe(false);
  });
});
