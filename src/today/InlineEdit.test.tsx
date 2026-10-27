import { describe, expect, it } from "vitest";
import { editToCommit } from "./InlineEdit";

describe("editToCommit", () => {
  it("saves the new words when they differ from the old ones, trimmed", () => {
    expect(editToCommit(" Call Aoi ", "Call the bank")).toBe("Call Aoi");
  });
  it("keeps the old words when nothing changed or nothing was typed, so a click elsewhere never loses or blanks a title", () => {
    expect(editToCommit("Call Aoi", "Call Aoi")).toBeUndefined();
    expect(editToCommit(" Call Aoi ", "Call Aoi")).toBeUndefined();
    expect(editToCommit("   ", "Call Aoi")).toBeUndefined();
    expect(editToCommit("", "")).toBeUndefined();
  });
});
