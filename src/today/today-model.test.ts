import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { CHIPS, nowCard, replyError } from "./today-model";

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

describe("nowCard", () => {
  it("is empty when nothing is open", () => {
    expect(nowCard([])).toBeNull();
  });

  it("makes the first task's next step the card, with the task title underneath", () => {
    const first = task("Newsletter", "Write the subject line");
    expect(nowCard([first, task("Email Aoi")])).toEqual({ text: "Write the subject line", taskTitle: "Newsletter", task: first });
  });

  it("falls back to the title when the first task has no next step", () => {
    const only = task("Email Aoi");
    expect(nowCard([only])).toEqual({ text: "Email Aoi", taskTitle: null, task: only });
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
