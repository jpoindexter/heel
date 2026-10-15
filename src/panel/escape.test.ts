import { describe, expect, it } from "vitest";
import { opensSearch, shouldCloseOnKey } from "./escape";

const key = (over: Partial<Parameters<typeof shouldCloseOnKey>[0]> = {}) => ({ key: "Escape", defaultPrevented: false, isComposing: false, ...over });

describe("shouldCloseOnKey", () => {
  it("closes on a plain Esc", () => expect(shouldCloseOnKey(key())).toBe(true));
  it("leaves Esc to an open select or menu that already used it", () => expect(shouldCloseOnKey(key({ defaultPrevented: true }))).toBe(false));
  it("ignores Esc pressed to cancel an IME composition", () => expect(shouldCloseOnKey(key({ isComposing: true }))).toBe(false));
  it("ignores other keys", () => expect(shouldCloseOnKey(key({ key: "Enter" }))).toBe(false));
});

describe("opensSearch", () => {
  const key = (over: Partial<Parameters<typeof opensSearch>[0]>) => ({ key: "k", metaKey: true, ctrlKey: false, defaultPrevented: false, isComposing: false, ...over });
  it("is ⌘K or ⌘F (Ctrl too), unless something else took the key", () => {
    expect(opensSearch(key({}))).toBe(true);
    expect(opensSearch(key({ key: "f" }))).toBe(true);
    expect(opensSearch(key({ metaKey: false, ctrlKey: true }))).toBe(true);
    expect(opensSearch(key({ metaKey: false }))).toBe(false);
    expect(opensSearch(key({ key: "j" }))).toBe(false);
    expect(opensSearch(key({ defaultPrevented: true }))).toBe(false);
  });
});
