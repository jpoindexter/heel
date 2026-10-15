import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { CHIPS, MAX_VISIBLE_TASKS, appliedLines, replyError, todayView } from "./today-model";

const task = (title: string, nowStep: string | null = null): TaskDto => ({
  id: title,
  title,
  status: "todo",
  nowStep,
  source: "capture",
  sourceRef: null,
  position: 1,
  createdAt: 1,
  updatedAt: 1,
  completedAt: null,
});

describe("todayView", () => {
  it("has no Now card when nothing is open", () => {
    expect(todayView([], false)).toEqual({ now: null, visible: [], hiddenCount: 0 });
  });

  it("makes the first task's next step the Now card, with the task title underneath", () => {
    const view = todayView([task("Newsletter", "Write the subject line"), task("Email Aoi")], false);
    expect(view.now).toEqual({ text: "Write the subject line", taskTitle: "Newsletter" });
  });

  it("falls back to the title when the first task has no next step", () => {
    expect(todayView([task("Email Aoi")], false).now).toEqual({ text: "Email Aoi", taskTitle: null });
  });

  it(`shows at most ${MAX_VISIBLE_TASKS} tasks and counts the rest`, () => {
    const tasks = ["a", "b", "c", "d", "e"].map((t) => task(t));
    const view = todayView(tasks, false);
    expect(view.visible.map((t) => t.title)).toEqual(["a", "b", "c"]);
    expect(view.hiddenCount).toBe(2);
  });

  it("shows everything when expanded", () => {
    const tasks = ["a", "b", "c", "d"].map((t) => task(t));
    expect(todayView(tasks, true)).toMatchObject({ hiddenCount: 0 });
    expect(todayView(tasks, true).visible).toHaveLength(4);
  });
});

describe("chips", () => {
  it("are exactly three, in a fixed order, with verb labels", () => {
    expect(CHIPS.map((c) => c.label)).toEqual(["Plan", "Stuck", "Park it"]);
  });

  it("send a prompt for Plan and Stuck, and none for Park it (it acts on the typed text)", () => {
    expect(CHIPS.map((c) => c.prompt === null)).toEqual([false, false, true]);
  });
});

describe("appliedLines", () => {
  it("reports what was done and prefixes failures so they can't be missed", () => {
    expect(
      appliedLines([
        { type: "add_task", ok: true, message: 'Added "Newsletter".' },
        { type: "complete_task", ok: false, message: 'Unknown task "t9".' },
      ]),
    ).toEqual([
      { ok: true, text: 'Added "Newsletter".' },
      { ok: false, text: `Couldn't: Unknown task "t9".` },
    ]);
  });
});

describe("replyError", () => {
  it("offers Settings for errors that Settings can fix", () => {
    expect(replyError("not_ready", "Choose an AI provider in Settings first.")).toEqual({
      message: "Choose an AI provider in Settings first.",
      offerSettings: true,
    });
    expect(replyError("not_signed_in", "x").offerSettings).toBe(true);
  });

  it("does not offer Settings for other errors", () => {
    expect(replyError("timeout", "Took too long.").offerSettings).toBe(false);
    expect(replyError("offline", "Heel's helper isn't running.").offerSettings).toBe(false);
  });
});
