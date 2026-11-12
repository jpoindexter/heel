import { describe, expect, it } from "vitest";
import { setup } from "./test-app";

describe("persisted onboarding", () => {
  it("captures a real task once, persists progress and replays without adding another", async () => {
    const test = setup();
    expect((await test.json("/onboarding")).data).toEqual({ step: 0, taskId: null });
    const first = await test.post("/onboarding/task", { title: "Remember the synthetic research call" });
    expect(first.ok).toBe(true);
    expect(first.data.step).toBe(1);
    expect(test.store.tasks.list()[0]!.title).toBe("Remember the synthetic research call");
    await test.post("/onboarding/task", { title: "Duplicate click" });
    expect(test.store.tasks.list()).toHaveLength(1);
    await test.send("PUT", "/onboarding", { step: 3 });
    expect((await test.json("/onboarding")).data.step).toBe(3);
    await test.send("PUT", "/onboarding", { step: 0 });
    expect((await test.json("/onboarding")).data.taskId).toBe(first.data.taskId);
    test.store.close();
  });
  it("rejects invalid changes without adding tasks or advancing setup", async () => {
    const test = setup();
    expect((await test.post("/onboarding/task", { title: "" })).ok).toBe(false);
    expect((await test.send("PUT", "/onboarding", { step: 20 })).ok).toBe(false);
    expect((await test.send("PUT", "/onboarding", null)).ok).toBe(false);
    expect((await test.json("/onboarding")).data.step).toBe(0);
    expect(test.store.tasks.list()).toHaveLength(0);
    test.store.close();
  });
});
