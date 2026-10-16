import { describe, expect, it } from "vitest";
import { SKILL_FILE_MAX_CHARS } from "../../shared/api";
import { NEW_SKILL_TEMPLATE, sizeNote, triggerLine } from "./skills-model";

describe("skills model", () => {
  it("starts from a template that fits", () => {
    expect(NEW_SKILL_TEMPLATE.length).toBeLessThan(SKILL_FILE_MAX_CHARS);
    expect(NEW_SKILL_TEMPLATE).toMatch(/^---\nname: [a-z-]+\ndescription: .+\ntriggers: .+\n---\n/);
  });

  it("counts the editor against the file limit", () => {
    expect(sizeNote(120)).toEqual({ text: `120 of ${SKILL_FILE_MAX_CHARS}`, over: false });
    expect(sizeNote(SKILL_FILE_MAX_CHARS + 1).over).toBe(true);
  });

  it("says what chooses a skill", () => {
    expect(triggerLine(["stuck", "can't start"])).toBe("When you say: stuck, can't start");
    expect(triggerLine(["always"])).toBe("Always on");
    expect(triggerLine([])).toMatch(/no trigger words/);
  });
});
