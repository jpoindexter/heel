import { describe, expect, it } from "vitest";
import { MAX_HISTORY_MESSAGES } from "../../shared/api";
import { answerFrom, historyFor, latestExchange, receiptSummary, toReceipts, withReceiptUndone, type Message } from "./thread-model";

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

  it("gives the model a chip's full prompt even though the thread shows only its label", () => {
    const messages: Message[] = [{ id: 1, role: "user", text: "Help me plan what to do next.", label: "Plan" }];
    expect(historyFor(messages)).toEqual([{ role: "user", text: "Help me plan what to do next." }]);
  });

  it("keeps only the most recent messages the helper accepts", () => {
    const messages = Array.from({ length: 20 }, (_, i) => user(i, `m${i}`));
    const history = historyFor(messages);
    expect(history).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(history.at(-1)!.text).toBe("m19");
  });
});


describe("answerFrom", () => {
  it("turns a reply into a said message with receipts", () => {
    const message = answerFrom({ ok: true, data: { say: "Done.", applied: [{ type: "add_task", ok: true, message: 'Added "x".' }], skills: [], provider: "claude" } }, 7, "asked");
    expect(message).toMatchObject({ id: 7, role: "heel", status: "said", say: "Done." });
    expect(message.role === "heel" && message.status === "said" && message.receipts).toHaveLength(1);
  });

  it("turns a failure into a failed message that remembers what to ask again, and offers Settings when Settings can fix it", () => {
    const failed = answerFrom({ ok: false, error: { code: "not_ready", message: "Choose an AI." } }, 3, "plan my day");
    expect(failed).toMatchObject({ status: "failed", message: "Choose an AI.", offerSettings: true, retryText: "plan my day" });
    expect(answerFrom({ ok: false, error: { code: "timeout", message: "Slow." } }, 3, "x")).toMatchObject({ offerSettings: false });
  });

  it("keeps what the person asked when they stopped it, so they can ask again", () => {
    expect(answerFrom({ ok: false, error: { code: "aborted", message: "Stopped." } }, 4, "plan my day")).toMatchObject({
      status: "failed",
      message: "Stopped.",
      offerSettings: false,
      retryText: "plan my day",
    });
  });
});

describe("withReceiptUndone", () => {
  const said = (id: number): Message => ({ id, role: "heel", status: "said", say: "x", receipts: [{ ok: true, text: "a", undo: null, undone: false }, { ok: true, text: "b", undo: null, undone: false }] });

  it("marks only the chosen receipt of the chosen message", () => {
    const next = withReceiptUndone([said(1), said(2)], 2, 1, true);
    expect(next[0]).toEqual(said(1));
    expect(next[1]!.role === "heel" && next[1]!.status === "said" && next[1]!.receipts.map((r) => r.undone)).toEqual([false, true]);
  });

  it("can put it back", () => {
    const undone = withReceiptUndone([said(1)], 1, 0, true);
    const back = withReceiptUndone(undone, 1, 0, false);
    expect(back[0]).toEqual(said(1));
  });
});

describe("latestExchange", () => {
  const said = (id: number): Message => ({ id, role: "heel", status: "said", say: "ok", receipts: [] });

  it("is nothing for an empty thread", () => {
    expect(latestExchange([])).toBeNull();
  });

  it("pairs Heel's last answer with what was asked, preferring a chip's label", () => {
    const thread: Message[] = [
      { id: 1, role: "user", text: "old" },
      said(2),
      { id: 3, role: "user", text: "Help me plan what to do next.", label: "Plan" },
      said(4),
    ];
    expect(latestExchange(thread)).toEqual({ asked: "Plan", heel: said(4) });
  });

  it("shows a pending answer too, so Thinking… has a place", () => {
    const pending: Message = { id: 2, role: "heel", status: "pending" };
    expect(latestExchange([{ id: 1, role: "user", text: "hi" }, pending])).toEqual({ asked: "hi", heel: pending });
  });
});
