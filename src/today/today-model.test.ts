import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import { CHIPS, emptyListLine, nowCard, replyError } from "./today-model";

describe("emptyListLine", () => {
  it("tells a first-time (or cleared-by-removal) list how to add, and a finished day that it is done", () => {
    expect(emptyListLine(0)).toContain("Nothing on your list");
    expect(emptyListLine(3)).toContain("All done for today");
    expect(emptyListLine(3)).not.toContain("Nothing on your list");
  });
});

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
  completedAt: null, size: null, bucket: null, estimateMin: null, parentId: null,
});

describe("nowCard", () => {
  it("is empty when nothing is open", () => {
    expect(nowCard([])).toBeNull();
  });

  it("makes the first task's next step the card, with the task title underneath", () => {
    const first = task("Newsletter", "Write the subject line");
    expect(nowCard([first, task("Email Aoi")])).toEqual({ text: "Write the subject line", taskTitle: "Newsletter", task: first });
  });

  it("makes the first open step of a split task the card, with the big task underneath", () => {
    const big = task("Move the studio");
    const step = { ...task("Book the van"), parentId: big.id };
    expect(nowCard([big, step, task("Email Aoi")])).toEqual({ text: "Book the van", taskTitle: "Move the studio", task: step });
  });

  it("falls back to the title when the first task has no next step", () => {
    const only = task("Email Aoi");
    expect(nowCard([only])).toEqual({ text: "Email Aoi", taskTitle: null, task: only });
  });
});

describe("chips", () => {
  it("are two asking starters, in a fixed order, with verb labels (Email is added by the view when connected)", () => {
    expect(CHIPS.map((c) => c.label)).toEqual(["Plan", "Stuck"]);
  });

  it("each send a real prompt to the AI", () => {
    expect(CHIPS.every((c) => c.prompt.length > 10)).toBe(true);
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
