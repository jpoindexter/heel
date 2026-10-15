import { describe, expect, it } from "vitest";
import { MAX_TASK_TITLE, isNewTaskKey, titleFromInput } from "./quick-add";

describe("titleFromInput", () => {
  it("tidies spaces and newlines into one line", () => expect(titleFromInput("  email   Aoi\nthe questions ")).toBe("email Aoi the questions"));
  it("adds nothing for an empty box", () => {
    expect(titleFromInput("")).toBeNull();
    expect(titleFromInput(" \n\t ")).toBeNull();
  });
  it("never goes past the limit", () => expect(titleFromInput("x".repeat(MAX_TASK_TITLE + 50))).toHaveLength(MAX_TASK_TITLE));
});

describe("isNewTaskKey", () => {
  const key = (over: object = {}) => ({ key: "n", metaKey: true, ctrlKey: false, altKey: false, shiftKey: false, ...over });
  it("is Cmd+N or Ctrl+N", () => {
    expect(isNewTaskKey(key())).toBe(true);
    expect(isNewTaskKey(key({ metaKey: false, ctrlKey: true, key: "N" }))).toBe(true);
  });
  it("is not a plain n, or n with other modifiers", () => {
    expect(isNewTaskKey(key({ metaKey: false }))).toBe(false);
    expect(isNewTaskKey(key({ shiftKey: true }))).toBe(false);
    expect(isNewTaskKey(key({ altKey: true }))).toBe(false);
  });
});
