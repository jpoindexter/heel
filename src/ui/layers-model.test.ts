import { describe, expect, it } from "vitest";
import { atRoot, back, baseState, forward, home, isOpen, push, ROOT, swipeFrom, topOf, underOf } from "./layers-model";
import { focusAfterLeave, openerOf } from "./layers-model";

describe("push / back / forward", () => {
  it("opens a layer on top and remembers what is under it", () => {
    const s = push(ROOT, "settings");
    expect(topOf(s)).toBe("settings");
    expect(underOf(s)).toBe("today");
    expect(atRoot(s)).toBe(false);
  });
  it("back pops one layer and keeps it for forward; forward brings it back", () => {
    const opened = push(push(ROOT, "settings"), "email");
    const one = back(opened);
    expect(one.open).toEqual(["today", "settings"]);
    expect(one.forward).toEqual(["email"]);
    expect(forward(one)).toEqual(opened);
  });
  it("does nothing at the root, and forward with nothing to go to", () => {
    expect(back(ROOT)).toBe(ROOT);
    expect(forward(ROOT)).toBe(ROOT);
  });
  it("forgets forward when something new opens", () => {
    const s = push(back(push(ROOT, "settings")), "email");
    expect(s.forward).toEqual([]);
  });
  it("keeps one of each layer: opening one already lower down moves it to the top", () => {
    const s = push(push(push(ROOT, "reply"), "settings"), "reply");
    expect(s.open).toEqual(["today", "settings", "reply"]);
  });
  it("home pops everything; pushing today is home", () => {
    const deep = push(push(ROOT, "settings"), "email");
    expect(home(deep)).toBe(ROOT);
    expect(push(deep, "today")).toBe(ROOT);
    expect(isOpen(deep, "email")).toBe(true);
  });
});

describe("baseState", () => {
  it("is flat alone, dimmed under a top layer, pushed back under a side layer (whichever is open)", () => {
    expect(baseState(ROOT)).toBe("flat");
    expect(baseState(push(ROOT, "email"))).toBe("dim");
    expect(baseState(push(ROOT, "settings"))).toBe("pushed");
    expect(baseState(push(push(ROOT, "settings"), "reply"))).toBe("pushed");
  });
});

describe("swipeFrom", () => {
  it("reads fingers moving right as back and left as forward, past the threshold only", () => {
    expect(swipeFrom(-200)).toBe("back");
    expect(swipeFrom(200)).toBe("forward");
    expect(swipeFrom(-40)).toBeNull();
    expect(swipeFrom(-50, 50)).toBe("back");
  });
});

describe("focusAfterLeave", () => {
  it("returns focus to the opener only while it is on screen and not covered", () => {
    expect(focusAfterLeave({ connected: true, covered: false })).toBe("opener");
    expect(focusAfterLeave({ connected: false, covered: false })).toBe("under");
    expect(focusAfterLeave({ connected: true, covered: true })).toBe("under");
    expect(focusAfterLeave(null)).toBe("under");
  });
});

describe("openerOf", () => {
  it("keeps the node and its accessible name, and copes with nothing focused", () => {
    const node = { getAttribute: (name: string) => (name === "aria-label" ? "Settings" : null) } as unknown as Element;
    expect(openerOf(node)).toEqual({ node, label: "Settings" });
    expect(openerOf(null)).toEqual({ node: null, label: null });
  });
});
