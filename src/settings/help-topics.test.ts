import { describe, expect, it } from "vitest";
import { HELP_TOPICS } from "./help-topics";

describe("HELP_TOPICS", () => {
  it("gives every topic a unique id, a title and at least one short step", () => {
    expect(new Set(HELP_TOPICS.map((t) => t.id)).size).toBe(HELP_TOPICS.length);
    for (const topic of HELP_TOPICS) {
      expect(topic.title.trim()).not.toBe("");
      expect(topic.steps.length).toBeGreaterThan(0);
      for (const step of topic.steps) expect(step.length).toBeLessThanOrEqual(200);
    }
  });

  it("covers what a tester needs first: getting around, the AI, feedback and trouble", () => {
    expect(HELP_TOPICS.map((t) => t.id)).toEqual(expect.arrayContaining(["start", "brain", "feedback", "trouble"]));
  });
});
