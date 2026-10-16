import type { Hono } from "hono";
import { SkillEnabledInputSchema, SkillInputSchema } from "../../shared/api";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

/** The skills manager (N3): see them, read one, add, edit and delete yours, switch any off. Plain instructions only: nothing here runs. */
export function registerSkillsRoutes(app: Hono, { skills }: AppDeps): void {
  const text = "Send {\"text\": \"---\\nname: …\\ndescription: …\\n---\\ninstructions\"}.";

  app.get("/skills", (c) => ok(c, { skills: skills.list() }));

  app.get("/skills/:id", (c) => {
    const id = c.req.param("id");
    const found = skills.text(id);
    return found.ok ? ok(c, { id, ...found.value }) : fail(c, found.error.code, found.error.message);
  });

  app.post("/skills", async (c) => {
    const body = SkillInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", text);
    const made = skills.create(body.data.text);
    return made.ok ? ok(c, { skill: made.value }) : fail(c, made.error.code, made.error.message);
  });

  app.put("/skills/:id", async (c) => {
    const body = SkillInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", text);
    const saved = skills.update(c.req.param("id"), body.data.text);
    return saved.ok ? ok(c, { skill: saved.value }) : fail(c, saved.error.code, saved.error.message);
  });

  app.post("/skills/:id/enabled", async (c) => {
    const body = SkillEnabledInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", 'Send {"enabled": true}.');
    const set = skills.setEnabled(c.req.param("id"), body.data.enabled);
    return set.ok ? ok(c, { skill: set.value }) : fail(c, set.error.code, set.error.message);
  });

  app.post("/skills/:id/delete", (c) => {
    const removed = skills.remove(c.req.param("id"));
    return removed.ok ? ok(c, removed.value) : fail(c, removed.error.code, removed.error.message);
  });

  app.post("/skills/:id/restore", (c) => {
    const back = skills.restore(c.req.param("id"));
    return back.ok ? ok(c, { skill: back.value }) : fail(c, back.error.code, back.error.message);
  });
}
