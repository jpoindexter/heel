import { describe, expect, it } from "vitest";
import { MethodSchema, TaskResultSchema, envelope } from "../../shared/api";
import { setup } from "./test-app";

const method = envelope(MethodSchema);
const taskResult = envelope(TaskResultSchema);

describe("GET /method", () => {
  it("is the default until something is chosen", async () => {
    expect(method.parse(await setup().json("/method"))).toEqual({ ok: true, data: { timer: "timebox", structure: "none", sizing: "none" } });
  });
});

describe("PUT /method", () => {
  it("saves a built choice and reads it back", async () => {
    const { json, send } = setup();
    const saved = method.parse(await send("PUT", "/method", { timer: "timebox", structure: "pickle-jar", sizing: "tshirt" }));
    expect(saved).toMatchObject({ ok: true, data: { structure: "pickle-jar", sizing: "tshirt" } });
    expect(method.parse(await json("/method"))).toMatchObject({ data: { structure: "pickle-jar" } });
  });

  it("refuses a method that is not built yet, in a sentence that says when", async () => {
    // The store says "conflict": the value is valid, just not available yet.
    const result = method.parse(await setup().send("PUT", "/method", { timer: "pomodoro", structure: "none", sizing: "none" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("N18");
  });

  it("rejects a value outside the enums", async () => {
    const result = method.parse(await setup().send("PUT", "/method", { timer: "egg", structure: "none", sizing: "none" }));
    expect(result).toMatchObject({ ok: false, error: { code: "invalid" } });
  });
});

describe("PATCH /tasks/:id", () => {
  it("sets a size and a bucket, leaves the other alone, and clears with null", async () => {
    const { store, send } = setup();
    const added = store.tasks.add({ title: "Invoice" });
    if (!added.ok) throw new Error("add failed");
    const sized = taskResult.parse(await send("PATCH", `/tasks/${added.value.id}`, { size: "m" }));
    expect(sized).toMatchObject({ ok: true, data: { task: { size: "m", bucket: null } } });
    const bucketed = taskResult.parse(await send("PATCH", `/tasks/${added.value.id}`, { bucket: "rock" }));
    expect(bucketed).toMatchObject({ ok: true, data: { task: { size: "m", bucket: "rock" } } });
    const cleared = taskResult.parse(await send("PATCH", `/tasks/${added.value.id}`, { size: null }));
    expect(cleared).toMatchObject({ ok: true, data: { task: { size: null, bucket: "rock" } } });
  });

  it("rejects a bucket no structure knows, and an empty patch", async () => {
    const { store, send } = setup();
    const added = store.tasks.add({ title: "Invoice" });
    if (!added.ok) throw new Error("add failed");
    expect(taskResult.parse(await send("PATCH", `/tasks/${added.value.id}`, { bucket: "boulder" }))).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(taskResult.parse(await send("PATCH", `/tasks/${added.value.id}`, {}))).toMatchObject({ ok: false });
  });
});
