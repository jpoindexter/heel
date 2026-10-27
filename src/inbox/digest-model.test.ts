import { describe, expect, it } from "vitest";
import { afterAddTask, type DigestState } from "./digest-model";

const ready: DigestState = { phase: "ready", digest: { items: [], considered: 0, sentToModel: "", checkedAt: 0 }, added: [], error: null };

describe("afterAddTask", () => {
  it("marks the item added and clears an older refusal", () => {
    expect(afterAddTask({ ...ready, error: "old" }, "m1", { ok: true, data: { id: "t1" } })).toMatchObject({ added: ["m1"], error: null });
  });
  it("keeps the digest and names the refusal, instead of swallowing it or replacing the list with an error screen", () => {
    expect(afterAddTask(ready, "m1", { ok: false, error: { code: "offline", message: "Not running." } })).toMatchObject({ phase: "ready", added: [], error: "Not running." });
  });
  it("leaves a list that is not ready alone", () => {
    expect(afterAddTask({ phase: "loading" }, "m1", { ok: true, data: {} })).toEqual({ phase: "loading" });
  });
});
