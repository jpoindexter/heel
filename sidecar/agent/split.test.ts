import { describe, expect, it } from "vitest";
import { cleanSteps, parseSplitReply, proposeSplit } from "./split";
import type { Provider } from "./providers/types";

const providerSaying = (...replies: string[]): Provider & { calls: number } => {
  const p = {
    id: "claude" as const,
    label: "Fake",
    calls: 0,
    status: async () => ({ id: "claude" as const, label: "Fake", installed: true, ready: true, detail: "" }),
    models: async () => ({ ok: true as const, value: [] }),
    complete: async () => ({ ok: true as const, value: replies[Math.min(p.calls++, replies.length - 1)] ?? "" }),
  };
  return p;
};

describe("split steps", () => {
  it("cleans bullets, numbering, blanks and repeats, and caps the count", () => {
    expect(cleanSteps(["1. Open the doc", "- Open the doc", "  ", "• Write the first line", 7, "2) Save it"])).toEqual(["Open the doc", "Write the first line", "Save it"]);
    expect(cleanSteps(Array.from({ length: 10 }, (_, i) => `step ${i}`))).toHaveLength(7);
  });

  it("parses a fenced reply and refuses prose, a missing list, or too few steps", () => {
    expect(parseSplitReply('```json\n{"steps": ["Open the doc", "Write one line"]}\n```')).toEqual({ ok: true, steps: ["Open the doc", "Write one line"] });
    expect(parseSplitReply("Sure! Here are steps")).toMatchObject({ ok: false });
    expect(parseSplitReply('{"say": "hi"}')).toMatchObject({ ok: false, error: "steps must be a list of strings" });
    expect(parseSplitReply('{"steps": ["Only one"]}')).toMatchObject({ ok: false });
  });

  it("asks once more with the reason, then gives up with a sentence", async () => {
    const good = providerSaying("nope", '{"steps": ["Open it", "Do it"]}');
    expect(await proposeSplit({ provider: good, model: null }, { title: "Big", nowStep: null })).toEqual({ ok: true, value: ["Open it", "Do it"] });
    expect(good.calls).toBe(2);
    const bad = providerSaying("nope");
    expect(await proposeSplit({ provider: bad, model: null }, { title: "Big", nowStep: null })).toMatchObject({ ok: false, error: { code: "failed" } });
  });
});
