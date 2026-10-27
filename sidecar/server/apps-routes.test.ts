import { describe, expect, it } from "vitest";
import { AppWrittenSchema, envelope } from "../../shared/api";
import { fakeApps } from "../apps/source";
import { setup } from "./test-app";

describe("apps routes", () => {
  it("writes to the app only through /apps/write and answers with the receipt line and its Undo", async () => {
    const apps = fakeApps();
    const { post } = setup({}, {}, undefined, undefined, { apps });
    const result = envelope(AppWrittenSchema).parse(await post("/apps/write", { write: { kind: "event", title: "Dentist", start: "2026-10-28T10:00" } }));
    expect(result).toEqual({ ok: true, data: { id: "event-1", undo: { kind: "delete_event", id: "event-1" }, message: 'Added to Calendar (Test): "Dentist" — Wed 28 Oct 10:00–11:00' } });
    expect(apps.added).toEqual([{ kind: "event", title: "Dentist", start: "2026-10-28T10:00" }]);
  });

  it("refuses a write with a bad date, and removes by kind and id for Undo", async () => {
    const apps = fakeApps();
    const { post } = setup({}, {}, undefined, undefined, { apps });
    expect(await post("/apps/write", { write: { kind: "reminder", title: "X", due: "tomorrow" } })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(await post("/apps/remove", { kind: "note", id: "x-coredata://a/b" })).toEqual({ ok: true, data: { removed: true } });
    expect(apps.removed).toEqual([["note", "x-coredata://a/b"]]);
    expect(apps.added).toEqual([]);
  });
});
