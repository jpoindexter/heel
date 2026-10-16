import { describe, expect, it } from "vitest";
import { skillLabel, usedLine } from "./skill-label";

describe("skill labels", () => {
  it("say a skill the way a person would", () => {
    expect(skillLabel("user:weekly-review")).toBe("weekly review");
    expect(skillLabel("nd-task-initiation")).toBe("task initiation");
    expect(skillLabel("writer")).toBe("writer");
  });

  it("list what was used, leaving the always-on router out, and say nothing when there is nothing", () => {
    expect(usedLine(["nd-executive-function-router", "user:weekly-review", "nd-time-blindness"])).toBe("Used: weekly review, time blindness");
    expect(usedLine(["nd-executive-function-router"])).toBeNull();
    expect(usedLine(undefined)).toBeNull();
  });
});
