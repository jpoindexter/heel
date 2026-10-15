import { describe, expect, it } from "vitest";
import { shouldCloseOnKey } from "./escape";

const key = (over: Partial<Parameters<typeof shouldCloseOnKey>[0]> = {}) => ({ key: "Escape", defaultPrevented: false, isComposing: false, ...over });

describe("shouldCloseOnKey", () => {
  it("closes on a plain Esc", () => expect(shouldCloseOnKey(key())).toBe(true));
  it("leaves Esc to an open select or menu that already used it", () => expect(shouldCloseOnKey(key({ defaultPrevented: true }))).toBe(false));
  it("ignores Esc pressed to cancel an IME composition", () => expect(shouldCloseOnKey(key({ isComposing: true }))).toBe(false));
  it("ignores other keys", () => expect(shouldCloseOnKey(key({ key: "Enter" }))).toBe(false));
});
