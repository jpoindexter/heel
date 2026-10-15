import { describe, expect, it } from "vitest";
import { BAR_TRAY, CARD_TRAY, TRAY_LABEL, TRAY_NAME, barHint, barKey, rollOrder } from "./bar-model";

describe("tray", () => {
  it("rolls out exactly four buttons in the bar and four in the card, chat only where chat is closed", () => {
    expect(BAR_TRAY).toEqual(["plan", "stuck", "email", "chat"]);
    expect(CARD_TRAY).toEqual(["add", "park", "plan", "stuck"]);
    expect(CARD_TRAY).not.toContain("chat");
  });

  it("names every action for the tooltip and the screen reader", () => {
    for (const action of [...BAR_TRAY, ...CARD_TRAY]) {
      expect(TRAY_NAME[action].length).toBeGreaterThan(0);
      expect(TRAY_LABEL[action].length).toBeGreaterThan(TRAY_NAME[action].length - 1);
    }
  });

  it("rolls in first-to-last and back last-to-first", () => {
    expect([0, 1, 2, 3].map((i) => rollOrder(i, 4, false))).toEqual([0, 1, 2, 3]);
    expect([0, 1, 2, 3].map((i) => rollOrder(i, 4, true))).toEqual([3, 2, 1, 0]);
  });
});

describe("barKey", () => {
  const key = (k: string, mods: Partial<{ shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; isComposing: boolean }> = {}) =>
    barKey({ key: k, shiftKey: false, metaKey: false, ctrlKey: false, ...mods });

  it("sends on Enter, adds on Cmd or Ctrl+Enter, closes on Escape", () => {
    expect(key("Enter")).toBe("send");
    expect(key("Enter", { metaKey: true })).toBe("add");
    expect(key("Enter", { ctrlKey: true })).toBe("add");
    expect(key("Escape")).toBe("close");
  });

  it("leaves Shift+Enter (new line), composing text and other keys alone", () => {
    expect(key("Enter", { shiftKey: true })).toBeNull();
    expect(key("Enter", { isComposing: true })).toBeNull();
    expect(key("a")).toBeNull();
  });
});

describe("barHint", () => {
  it("says nothing for an empty box, the keys while typing, and the wait while thinking", () => {
    expect(barHint(true, false)).toBe("");
    expect(barHint(false, false)).toContain("⌘↩");
    expect(barHint(false, true)).toBe("Heel is thinking");
  });
});
