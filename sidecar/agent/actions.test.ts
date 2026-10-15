import { describe, expect, it } from "vitest";
import { MAX_ACTIONS_PER_REPLY, parseAgentReply } from "./actions";

const valid = { say: "Added it.", actions: [{ type: "add_task", title: "Email Aoi" }] };

describe("parseAgentReply", () => {
  it("accepts a plain JSON reply", () => {
    expect(parseAgentReply(JSON.stringify(valid))).toEqual({ ok: true, reply: valid });
  });

  it("accepts JSON wrapped in a code fence and surrounding prose", () => {
    const text = `Sure.\n\`\`\`json\n${JSON.stringify(valid)}\n\`\`\`\nHope that helps.`;
    expect(parseAgentReply(text)).toEqual({ ok: true, reply: valid });
  });

  it("defaults actions to an empty list", () => {
    expect(parseAgentReply('{"say":"Hello."}')).toEqual({ ok: true, reply: { say: "Hello.", actions: [] } });
  });

  it("rejects prose with no JSON", () => {
    expect(parseAgentReply("I added your task!")).toEqual({ ok: false, error: "the reply was not a JSON object" });
  });

  it("names the missing field when say is absent or empty", () => {
    const result = parseAgentReply('{"say":"  ","actions":[]}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("say");
  });

  it("rejects an action type the app does not support", () => {
    const result = parseAgentReply('{"say":"x","actions":[{"type":"send_email","to":"a@b.c"}]}');
    expect(result.ok).toBe(false);
  });

  it("rejects a task ref that is not like t1, so raw ids are never accepted", () => {
    const result = parseAgentReply('{"say":"x","actions":[{"type":"complete_task","task":"8f3c-uuid"}]}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("task");
  });

  it("rejects more than the allowed number of actions", () => {
    const actions = Array.from({ length: MAX_ACTIONS_PER_REPLY + 1 }, () => ({ type: "park_idea", idea: "x" }));
    const result = parseAgentReply(JSON.stringify({ say: "x", actions }));
    expect(result.ok).toBe(false);
  });

  it("does not offer focus sessions until the focus slice ships", () => {
    const start = parseAgentReply('{"say":"x","actions":[{"type":"start_focus","goal":"g","best_min":1,"realistic_min":2,"worst_min":3}]}');
    const end = parseAgentReply('{"say":"x","actions":[{"type":"end_focus","outcome":"done"}]}');
    expect([start.ok, end.ok]).toEqual([false, false]);
  });
});
