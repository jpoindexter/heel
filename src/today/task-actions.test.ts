import { describe, expect, it } from "vitest";
import type { TaskDto } from "../../shared/api";
import type { Client } from "../api/client";
import type { Notice } from "../ui/notice-model";
import { createTaskActions, lastStepParent } from "./task-actions";

describe("Undo that the helper refuses", () => {
  it("says so in an error notice instead of failing quietly", async () => {
    const notices: Notice[] = [];
    const answers: Record<string, unknown> = { "/tasks/t1/drop": { ok: true, data: { task: task("t1") } }, "/tasks/t1/restore": { ok: false, error: { code: "offline", message: "Heel's helper isn't running." } } };
    const client = { post: async (path: string) => answers[path], patch: async () => ({ ok: true, data: {} }) } as unknown as Client;
    const actions = createTaskActions({ client, refresh: async () => undefined, dropLocally: () => undefined, notify: (n) => notices.push(n), doneToday: () => 0, openTasks: () => [] });
    await actions.remove(task("t1"));
    notices[0]?.undo?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(notices.map((n) => n.tone)).toEqual(["info", "error"]);
    expect(notices[1]?.message).toBe("Heel's helper isn't running.");
  });
});

const task = (id: string, parentId: string | null = null): TaskDto => ({ id, title: id, status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 0, createdAt: 0, updatedAt: 0, completedAt: null, size: null, bucket: null, estimateMin: null, parentId });

describe("lastStepParent", () => {
  it("names the parent only when the finished step was its last open one", () => {
    const big = task("big");
    expect(lastStepParent(task("s2", "big"), [big])).toEqual(big);
    expect(lastStepParent(task("s2", "big"), [big, task("s3", "big")])).toBeNull();
    expect(lastStepParent(task("plain"), [big])).toBeNull();
    expect(lastStepParent(task("s2", "gone"), [big])).toBeNull();
  });
});

describe("placeOf (N7)", () => {
  const task = (id: string, parentId: string | null = null) => ({ id, parentId }) as unknown as import("../../shared/api").TaskDto;
  it("counts a task's place among the open tasks that share its parent", async () => {
    const { placeOf } = await import("./task-actions");
    const open = [task("a"), task("a1", "a"), task("b"), task("a2", "a"), task("c")];
    expect(open.map((t) => placeOf(t, open))).toEqual([0, 0, 1, 1, 2]);
  });
});
