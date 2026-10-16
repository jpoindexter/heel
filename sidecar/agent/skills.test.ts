import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BUNDLED_SKILLS, TRIGGER_WORDS } from "./bundled-skills";
import { SKILL_SIGNALS, SKILLS_DIR, selectSkills } from "./prompt";
import { createSkillsService, parseSkill } from "./skills";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const GOOD = "---\nname: weekly-review\ndescription: A calm Friday look back.\ntriggers: weekly review, friday\n---\nAsk what got done, what slipped, and one thing for Monday.";

function service() {
  const userDir = mkdtempSync(join(tmpdir(), "heel-skills-"));
  dirs.push(userDir);
  let off: string[] = [];
  return { userDir, svc: createSkillsService({ bundledDir: SKILLS_DIR, bundled: BUNDLED_SKILLS, userDir, off: () => off, setOff: (ids) => (off = ids) }) };
}

describe("parseSkill", () => {
  it("reads name, description, triggers and the instructions", () => {
    expect(parseSkill(GOOD)).toEqual({ ok: true, value: { name: "weekly-review", description: "A calm Friday look back.", triggers: ["weekly review", "friday"], body: "Ask what got done, what slipped, and one thing for Monday." } });
  });

  it("says what is wrong in a sentence", () => {
    const err = (raw: string) => {
      const r = parseSkill(raw);
      return r.ok ? "" : r.error.message;
    };
    expect(err("just text")).toMatch(/front matter/);
    expect(err("---\nname: Bad Name\ndescription: x\n---\nbody")).toMatch(/lowercase letters/);
    expect(err("---\nname: ok-name\n---\nbody")).toMatch(/description is needed/);
    expect(err("---\nname: ok-name\ndescription: x\n---\n")).toMatch(/no instructions/);
    expect(err(`---\nname: ok-name\ndescription: x\n---\n${"a".repeat(9000)}`)).toMatch(/limit is 8000/);
    expect(err(`---\nname: ok-name\ndescription: x\ntriggers: ${Array.from({ length: 13 }, (_, i) => `t${i}`).join(",")}\n---\nb`)).toMatch(/At most 12/);
  });
});

describe("the bundled list", () => {
  it("covers the router, every skill a signal can choose and the fallback, each with words that choose it", () => {
    const ids = BUNDLED_SKILLS.map((s) => s.id);
    for (const [, skill] of SKILL_SIGNALS) expect(ids).toContain(skill);
    expect(ids[0]).toBe("nd-executive-function-router");
    for (const skill of BUNDLED_SKILLS.slice(1)) expect(TRIGGER_WORDS[skill.id]?.length, skill.id).toBeGreaterThan(0);
  });

  it("is found on disk with a name and a description, the router locked", () => {
    const { svc } = service();
    const list = svc.list();
    expect(list.map((s) => s.id)).toEqual(BUNDLED_SKILLS.map((s) => s.id));
    expect(list[0]).toMatchObject({ locked: true, enabled: true, source: "bundled" });
    expect(list.every((s) => s.description.length > 0 && s.chars > 0)).toBe(true);
  });
});

describe("your skills", () => {
  it("adds, reads, edits, switches off, deletes and brings one back", () => {
    const { svc, userDir } = service();
    const added = svc.create(GOOD);
    expect(added).toMatchObject({ ok: true, value: { id: "user:weekly-review", source: "yours", triggers: ["weekly review", "friday"], enabled: true } });
    expect(svc.create(GOOD)).toMatchObject({ ok: false, error: { code: "conflict" } });
    expect(svc.text("user:weekly-review")).toMatchObject({ ok: true, value: { editable: true } });
    expect(svc.load("user:weekly-review")).toBe("Ask what got done, what slipped, and one thing for Monday.");
    expect(svc.update("user:weekly-review", GOOD.replace("Monday", "Tuesday"))).toMatchObject({ ok: true });
    expect(svc.load("user:weekly-review")).toContain("Tuesday");
    expect(svc.update("user:weekly-review", GOOD.replace("weekly-review", "other-name"))).toMatchObject({ ok: false, error: { code: "conflict" } });
    expect(svc.setEnabled("user:weekly-review", false)).toMatchObject({ ok: true, value: { enabled: false } });
    expect(svc.load("user:weekly-review")).toBeNull();
    expect(svc.forSelection().yours).toEqual([]);
    expect(svc.remove("user:weekly-review")).toEqual({ ok: true, value: { id: "user:weekly-review" } });
    expect(svc.list().some((s) => s.source === "yours")).toBe(false);
    expect(existsSync(join(userDir, ".trash", "weekly-review", "SKILL.md"))).toBe(true);
    expect(svc.restore("user:weekly-review")).toMatchObject({ ok: true, value: { id: "user:weekly-review" } });
    expect(svc.restore("user:weekly-review")).toMatchObject({ ok: false });
  });

  it("refuses path tricks, editing a bundled skill, and switching the router off", () => {
    const { svc } = service();
    for (const id of ["user:../../etc", "user:a/b", "user:", "../x", "user:..", "nd-does-not-exist"]) {
      expect(svc.text(id).ok, id).toBe(false);
      expect(svc.remove(id).ok, id).toBe(false);
      expect(svc.load(id), id).toBeNull();
    }
    expect(svc.update("nd-inhibit", GOOD)).toMatchObject({ ok: false });
    expect(svc.remove("nd-task-initiation")).toMatchObject({ ok: false });
    expect(svc.text("nd-task-initiation")).toMatchObject({ ok: true, value: { editable: false } });
    expect(svc.setEnabled("nd-executive-function-router", false)).toMatchObject({ ok: false, error: { code: "conflict" } });
  });
});

describe("selection with your skills", () => {
  it("puts yours first when their words appear, drops switched-off bundled ones, and keeps the router and the cap", () => {
    const yours = [{ id: "user:weekly-review", triggers: ["weekly review", "friday"] }];
    expect(selectSkills("time for the weekly review, I'm stuck", { yours, off: new Set() })).toEqual(["nd-executive-function-router", "user:weekly-review", "nd-task-initiation"]);
    expect(selectSkills("I'm stuck", { yours, off: new Set(["nd-task-initiation"]) })).toEqual(["nd-executive-function-router"]);
    expect(selectSkills("hello", { yours: [], off: new Set(["nd-task-initiation"]) })).toEqual(["nd-executive-function-router"]);
    expect(selectSkills("FRIDAY wrap up", { yours, off: new Set() })).toEqual(["nd-executive-function-router", "user:weekly-review"]);
    expect(selectSkills("weekly review, I'm overwhelmed and stuck with a deadline", { yours, off: new Set() }).length).toBeLessThanOrEqual(3);
  });
});
