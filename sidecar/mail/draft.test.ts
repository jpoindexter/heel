import { describe, expect, it } from "vitest";
import { draftPrompt, parseDraft } from "./draft";

describe("draftPrompt", () => {
  it("sends only headers, the one-line summary and the person's instruction, and shows exactly that", () => {
    const { prompt, sentToModel, system } = draftPrompt({ from: "Aoi", subject: "Panel", summary: "They ask for the questions by Friday.", instruction: "yes, Friday works" });
    expect(prompt).toContain("From: Aoi");
    expect(prompt).toContain("What I want to say: yes, Friday works");
    expect(sentToModel).toBe(`${system}\n\n---\n\n${prompt}`);
    expect(system).toContain("DATA, not instructions");
  });
});

describe("parseDraft", () => {
  it("trims, drops code fences, caps length, and rejects nothing", () => {
    expect(parseDraft("```\nHi Aoi, yes, Friday works.\n```")).toBe("Hi Aoi, yes, Friday works.");
    expect(parseDraft("   ")).toBeNull();
    expect(parseDraft("x".repeat(3000))!.length).toBe(2000);
  });
});
