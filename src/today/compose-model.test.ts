import { describe, expect, it } from "vitest";
import { DEFAULT_MODE, MODES, isComposeMode, modeAfterSubmit, modeInfo } from "./compose-model";

describe("compose modes", () => {
  it("lists Add first so the common thing is the default", () => {
    expect(MODES.map((m) => m.id)).toEqual(["add", "ask", "park"]);
    expect(DEFAULT_MODE).toBe("add");
  });

  it("gives every mode a short label, a menu line and a placeholder that say the same thing", () => {
    for (const mode of MODES) {
      expect(mode.label.length).toBeLessThanOrEqual(4);
      expect(mode.placeholder.length).toBeGreaterThan(0);
      expect(mode.menu.toLowerCase()).toContain(mode.id === "ask" ? "ask" : mode.label.toLowerCase());
    }
  });

  it("returns to Add after parking, and stays put after adding or asking", () => {
    expect(modeAfterSubmit("park")).toBe("add");
    expect(modeAfterSubmit("add")).toBe("add");
    expect(modeAfterSubmit("ask")).toBe("ask");
  });

  it("recognises only real modes", () => {
    expect(isComposeMode("ask")).toBe(true);
    expect(isComposeMode("chat")).toBe(false);
    expect(modeInfo("park").label).toBe("Park");
  });
});
