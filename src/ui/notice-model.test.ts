import { describe, expect, it } from "vitest";
import { BubblePayloadSchema, replaceNotice, routeNotice, toBubble } from "./notice-model";

const quietDay = { panelVisible: false, quiet: false, focusRunning: false };

describe("routeNotice", () => {
  it("goes to the panel's toast whenever the panel is open, whatever else is going on", () => {
    expect(routeNotice({}, { panelVisible: true, quiet: true, focusRunning: true })).toBe("panel");
  });
  it("goes to Greg's bubble when the panel is closed", () => {
    expect(routeNotice({}, quietDay)).toBe("bubble");
  });
  it("stays silent next to Greg in Quiet mode", () => {
    expect(routeNotice({}, { ...quietDay, quiet: true })).toBe("silent");
  });
  it("stays silent during a time-box unless the notice is about that time-box", () => {
    expect(routeNotice({}, { ...quietDay, focusRunning: true })).toBe("silent");
    expect(routeNotice({ aboutFocus: true }, { ...quietDay, focusRunning: true })).toBe("bubble");
  });
});

describe("replaceNotice", () => {
  it("starts a fresh count when nothing is showing", () => {
    expect(replaceNotice(null, { message: "Added: x", tone: "info" }, 7)).toEqual({ message: "Added: x", tone: "info", id: 7, count: 1 });
  });
  it("replaces the one showing and counts it", () => {
    const first = replaceNotice(null, { message: "Added: x", tone: "info" }, 1);
    const second = replaceNotice(first, { message: "Parked: y", tone: "info" }, 2);
    expect(second).toMatchObject({ message: "Parked: y", id: 2, count: 2 });
    expect(replaceNotice(second, { message: "Removed: z", tone: "info" }, 3).count).toBe(3);
  });
});

describe("toBubble", () => {
  it("carries what the window needs and says whether Undo exists, never the function", () => {
    const bubble = toBubble({ id: 3, count: 1, message: "Completed: x", tone: "info", undo: () => undefined });
    expect(bubble).toEqual({ id: 3, message: "Completed: x", tone: "info", undoable: true, choices: [] });
    expect(BubblePayloadSchema.safeParse(bubble).success).toBe(true);
    expect(BubblePayloadSchema.safeParse({ ...bubble, tone: "loud" }).success).toBe(false);
  });
});

describe("choices", () => {
  it("cross the window as labels only, and Undo is left out when there are choices", () => {
    const bubble = toBubble({ id: 4, count: 1, message: "Back to it?", tone: "info", choices: [{ label: "Back to it", run: () => undefined }, { label: "Not now", run: () => undefined }] });
    expect(bubble.choices).toEqual(["Back to it", "Not now"]);
    expect(BubblePayloadSchema.safeParse(bubble).success).toBe(true);
  });
});
