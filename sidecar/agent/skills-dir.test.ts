import { describe, expect, it } from "vitest";
import { skillsDir } from "./skills-dir";

const FALLBACK = new URL("file:///repo/skills/nd-skills/");

describe("skillsDir", () => {
  it("uses the source folder unless told otherwise", () => {
    expect(skillsDir({}, FALLBACK).href).toBe(FALLBACK.href);
    expect(skillsDir({ HEEL_SKILLS_DIR: "  " }, FALLBACK).href).toBe(FALLBACK.href);
  });

  it("uses the packaged folder when HEEL_SKILLS_DIR is set, always ending in a slash so file names resolve inside it", () => {
    expect(skillsDir({ HEEL_SKILLS_DIR: "/Applications/Heel.app/Contents/Resources/sidecar/skills/nd-skills" }, FALLBACK).href).toBe(
      "file:///Applications/Heel.app/Contents/Resources/sidecar/skills/nd-skills/",
    );
    expect(new URL("nd/SKILL.md", skillsDir({ HEEL_SKILLS_DIR: "/x/skills/" }, FALLBACK)).href).toBe("file:///x/skills/nd/SKILL.md");
  });
});
