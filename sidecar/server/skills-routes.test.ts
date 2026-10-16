import { describe, expect, it } from "vitest";
import { SkillResultSchema, SkillTextSchema, SkillsListSchema, TurnResultSchema, envelope } from "../../shared/api";
import { fakeProvider, setup } from "./test-app";

const list = envelope(SkillsListSchema);
const one = envelope(SkillResultSchema);
const text = envelope(SkillTextSchema);
const turn = envelope(TurnResultSchema);

const SKILL = "---\nname: weekly-review\ndescription: A calm Friday look back.\ntriggers: weekly review\n---\nAsk what got done and one thing for Monday.";

describe("skills", () => {
  it("lists bundled skills, adds one of yours, and a matching message chooses it", async () => {
    const claude = fakeProvider("claude", {}, { ok: true, value: [] }, { ok: true, value: '{"say":"Here is the review.","actions":[]}' });
    const { store, json, post, send } = setup({ claude });
    store.settings.setBrain({ provider: "claude", model: null });
    const before = list.parse(await json("/skills"));
    expect(before.ok && before.data.skills.map((s) => s.source)).toContain("bundled");
    expect(one.parse(await post("/skills", { text: SKILL }))).toMatchObject({ ok: true, data: { skill: { id: "user:weekly-review", source: "yours" } } });
    const answered = turn.parse(await post("/turn", { text: "let's do my weekly review" }));
    expect(answered.ok && answered.data.skills).toContain("user:weekly-review");
    expect(one.parse(await send("POST", "/skills/user%3Aweekly-review/enabled", { enabled: false }))).toMatchObject({ ok: true, data: { skill: { enabled: false } } });
    const after = turn.parse(await post("/turn", { text: "let's do my weekly review" }));
    expect(after.ok && after.data.skills).not.toContain("user:weekly-review");
  });

  it("reads, edits, deletes and restores through the routes; rejects a bad skill with a sentence", async () => {
    const { post, send, json } = setup();
    await post("/skills", { text: SKILL });
    expect(text.parse(await json("/skills/user%3Aweekly-review"))).toMatchObject({ ok: true, data: { editable: true } });
    expect(text.parse(await json("/skills/nd-task-initiation"))).toMatchObject({ ok: true, data: { editable: false } });
    expect(one.parse(await send("PUT", "/skills/user%3Aweekly-review", { text: SKILL.replace("Monday", "Tuesday") }))).toMatchObject({ ok: true });
    expect(await post("/skills/user%3Aweekly-review/delete", {})).toMatchObject({ ok: true });
    expect(list.parse(await json("/skills"))).toMatchObject({ ok: true });
    expect(one.parse(await post("/skills/user%3Aweekly-review/restore", {}))).toMatchObject({ ok: true });
    expect(one.parse(await post("/skills", { text: "no front matter" }))).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(one.parse(await post("/skills/nd-executive-function-router/enabled", { enabled: false }))).toMatchObject({ ok: false, error: { code: "conflict" } });
  });
});
