import { describe, expect, it } from "vitest";
import { shouldBlockContextMenu } from "./context-menu";

describe("shouldBlockContextMenu", () => {
  it("blocks the menu on the mascot and plain elements", () => {
    expect(shouldBlockContextMenu({ tagName: "DIV" })).toBe(true);
    expect(shouldBlockContextMenu({ tagName: "BUTTON" })).toBe(true);
    expect(shouldBlockContextMenu(null)).toBe(true);
  });

  it("keeps the menu for text fields so paste still works", () => {
    expect(shouldBlockContextMenu({ tagName: "input" })).toBe(false);
    expect(shouldBlockContextMenu({ tagName: "TEXTAREA" })).toBe(false);
    expect(shouldBlockContextMenu({ tagName: "DIV", isContentEditable: true })).toBe(false);
  });
});
