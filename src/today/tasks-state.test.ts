import { describe, expect, it } from "vitest";
import type { ParkedIdeaDto } from "../../shared/api";
import { afterRefresh, showLoadingLine, type TasksState } from "./tasks-state";

const idea: ParkedIdeaDto = { id: "p1", idea: "Paint the van", createdAt: 0 };
const shown: TasksState = { phase: "ready", tasks: [], parked: [idea], doneToday: 2 };
const ok = <T,>(data: T) => ({ ok: true as const, data });
const refused = { ok: false as const, error: { code: "offline", message: "Not running." } };
const fresh = ok({ tasks: [], parkedCount: 0, doneToday: 3 });

describe("afterRefresh", () => {
  it("keeps the parked ideas on screen when only their reload failed", () => {
    expect(afterRefresh(shown, fresh, refused)).toMatchObject({ phase: "ready", parked: [idea], doneToday: 3 });
  });
  it("takes the fresh parked list when it came", () => {
    expect(afterRefresh(shown, fresh, ok({ parked: [] }))).toMatchObject({ parked: [] });
  });
  it("keeps what is shown when the tasks fail to reload, and shows the error only on a first load", () => {
    expect(afterRefresh(shown, refused, refused)).toBe(shown);
    expect(afterRefresh({ phase: "loading" }, refused, refused)).toEqual({ phase: "error", message: "Not running." });
  });
});

describe("showLoadingLine", () => {
  it("stays quiet for the first 200 ms of a first load, then says so", () => {
    expect(showLoadingLine("loading", 0)).toBe(false);
    expect(showLoadingLine("loading", 199)).toBe(false);
    expect(showLoadingLine("loading", 200)).toBe(true);
  });
  it("never shows once the list is ready or failed, however long the wait was", () => {
    expect(showLoadingLine("ready", 5_000)).toBe(false);
    expect(showLoadingLine("error", 5_000)).toBe(false);
  });
});
