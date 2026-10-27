import { describe, expect, it } from "vitest";
import { MethodSchema, TaskResultSchema, envelope } from "../../shared/api";
import { MethodNumbersSchema } from "../../shared/method";
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

describe("/method/numbers", () => {
  it("has defaults, saves whole minutes, and refuses nonsense", async () => {
    const { json, send } = setup();
    const numbers = envelope(MethodNumbersSchema);
    expect(numbers.parse(await json("/method/numbers"))).toMatchObject({ ok: true, data: { jarCapacityMin: 240, maxRocks: 2, sizeMinutes: { m: 50 }, slots: { big: 1, medium: 3, small: 5 }, quickMin: 2, ivyLeeCount: 6 } });
    expect(numbers.parse(await send("PUT", "/method/numbers", { jarCapacityMin: 300, maxRocks: 3, sizeMinutes: { xs: 5, s: 15, m: 30, l: 60, xl: 120 } }))).toMatchObject({ ok: true, data: { jarCapacityMin: 300, sizeMinutes: { xl: 120 } } });
    expect(numbers.parse(await json("/method/numbers"))).toMatchObject({ data: { maxRocks: 3 } });
    expect(numbers.parse(await send("PUT", "/method/numbers", { jarCapacityMin: 5 }))).toMatchObject({ ok: false });
  });
});

describe("PATCH /tasks/:id for the person's own edits (N7)", () => {
  it("renames, sets the next step and moves a task to Now", async () => {
    const { store, send } = setup();
    const a = store.tasks.add({ title: "A" });
    const b = store.tasks.add({ title: "B" });
    if (!a.ok || !b.ok) throw new Error("setup");
    expect(await send("PATCH", `/tasks/${b.value.id}`, { title: "Bee", nowStep: "Open the hive" })).toMatchObject({ ok: true, data: { task: { title: "Bee", nowStep: "Open the hive" } } });
    expect(await send("PATCH", `/tasks/${b.value.id}`, { place: 0 })).toMatchObject({ ok: true });
    expect(store.tasks.list().map((t) => t.title)).toEqual(["Bee", "A"]);
    expect(await send("PATCH", `/tasks/${b.value.id}`, { title: "" })).toMatchObject({ ok: false, error: { code: "invalid" } });
  });
});
