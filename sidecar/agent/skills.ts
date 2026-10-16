import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SKILL_FILE_MAX_CHARS, type SkillInfoDto } from "../../shared/api";
import { fail, ok, type Result } from "../store/result";

export const USER_PREFIX = "user:";
/** What the model reads of one skill; the file may be longer, and the editor says how much is read. */
export const SKILL_CHAR_LIMIT = 5_000;
const MAX_TRIGGERS = 12;
const MAX_DESCRIPTION = 300;
const SLUG = /^[a-z0-9][a-z0-9-]{1,39}$/;
const TRASH = ".trash";

export type ParsedSkill = { name: string; description: string; triggers: string[]; body: string };

/**
 * A SKILL.md: front matter (name, description, optional triggers) between --- lines, then the instructions. Plain text only.
 * Yours are held to the limits; the vendored ones are read as they are (the model reads at most SKILL_CHAR_LIMIT of any).
 */
export function parseSkill(raw: string, { vendored = false }: { vendored?: boolean } = {}): Result<ParsedSkill> {
  const text = raw.replace(/\r\n/g, "\n");
  if (!vendored && text.length > SKILL_FILE_MAX_CHARS) return fail("invalid", `That skill is ${text.length} characters. The limit is ${SKILL_FILE_MAX_CHARS}.`);
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text.trim() + "\n");
  if (!match) return fail("invalid", "A skill starts with a front matter block: --- name: …  description: … --- and then the instructions.");
  const fields = new Map<string, string>();
  for (const line of match[1]!.split("\n")) {
    const at = line.indexOf(":");
    if (at > 0) fields.set(line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim());
  }
  const name = fields.get("name") ?? "";
  if (!vendored && !SLUG.test(name)) return fail("invalid", 'name must be lowercase letters, numbers and dashes, 2–40 characters, e.g. "weekly-review".');
  const description = fields.get("description") ?? "";
  if (!description) return fail("invalid", "description is needed: one sentence on when Heel should use this skill.");
  if (!vendored && description.length > MAX_DESCRIPTION) return fail("invalid", `description is ${description.length} characters. Keep it under ${MAX_DESCRIPTION}.`);
  const triggers = (fields.get("triggers") ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (triggers.length > MAX_TRIGGERS) return fail("invalid", `At most ${MAX_TRIGGERS} triggers.`);
  const body = match[2]!.trim();
  if (!body) return fail("invalid", "The skill has no instructions after the front matter.");
  return ok({ name, description, triggers: [...new Set(triggers)], body });
}

/** The words that choose a skill from a message: any of its triggers appearing in the text (case does not matter). */
export const triggered = (triggers: readonly string[], text: string): boolean => {
  const lower = text.toLowerCase();
  return triggers.some((trigger) => lower.includes(trigger));
};

export type BundledSkill = { id: string; triggers: string[]; locked?: boolean };

type Deps = {
  /** The vendored skills folder (read only). */
  bundledDir: URL;
  /** Which bundled skills exist for the agent and what words choose them. */
  bundled: readonly BundledSkill[];
  /** Where yours live: <app data>/skills/<name>/SKILL.md. */
  userDir: string;
  off: () => string[];
  setOff: (ids: string[]) => void;
};

const userId = (slug: string) => `${USER_PREFIX}${slug}`;
const slugOf = (id: string): string | null => (id.startsWith(USER_PREFIX) && SLUG.test(id.slice(USER_PREFIX.length)) ? id.slice(USER_PREFIX.length) : null);

/** Your skills on disk: <dir>/<slug>/SKILL.md, with .trash/<slug> holding the last one deleted (Undo is a rename). */
function userFiles(dir: string) {
  const fileOf = (slug: string) => join(dir, slug, "SKILL.md");
  const trashed = (slug: string) => join(dir, TRASH, slug);
  return {
    has: (slug: string) => existsSync(fileOf(slug)),
    read: (slug: string): string | null => (existsSync(fileOf(slug)) ? readFileSync(fileOf(slug), "utf8") : null),
    slugs: (): string[] => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && SLUG.test(e.name)).map((e) => e.name) : []),
    write: (slug: string, raw: string) => {
      mkdirSync(join(dir, slug), { recursive: true });
      writeFileSync(fileOf(slug), raw.endsWith("\n") ? raw : `${raw}\n`, "utf8");
    },
    trash: (slug: string) => {
      mkdirSync(join(dir, TRASH), { recursive: true });
      rmSync(trashed(slug), { recursive: true, force: true });
      renameSync(join(dir, slug), trashed(slug));
    },
    hasTrash: (slug: string) => existsSync(trashed(slug)),
    untrash: (slug: string) => renameSync(trashed(slug), join(dir, slug)),
  };
}

type Files = ReturnType<typeof userFiles>;

/** What exists and what each file says. Disk is read at each call, so an edit needs no restart. */
function catalogue(deps: Deps, files: Files) {
  const bundledRaw = (id: string): string | null => {
    try {
      return readFileSync(new URL(`${id}/SKILL.md`, deps.bundledDir), "utf8");
    } catch {
      return null;
    }
  };
  const rawOf = (id: string): string | null => {
    const slug = slugOf(id);
    return slug ? files.read(slug) : deps.bundled.some((b) => b.id === id) ? bundledRaw(id) : null;
  };
  const info = (id: string, raw: string, source: "bundled" | "yours", triggers: string[] | null, locked: boolean): SkillInfoDto | null => {
    const parsed = parseSkill(raw, { vendored: source === "bundled" });
    if (!parsed.ok) return null;
    return { id, name: parsed.value.name, source, description: parsed.value.description, triggers: triggers ?? parsed.value.triggers, enabled: locked || !deps.off().includes(id), locked, chars: parsed.value.body.length };
  };
  const yours = (): SkillInfoDto[] =>
    files
      .slugs()
      .flatMap((slug) => {
        const raw = files.read(slug);
        const found = raw ? info(userId(slug), raw, "yours", null, false) : null;
        return found ? [found] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  const list = (): SkillInfoDto[] => {
    const bundled = deps.bundled.flatMap((b) => {
      const raw = bundledRaw(b.id);
      const found = raw ? info(b.id, raw, "bundled", b.triggers, b.locked ?? false) : null;
      return found ? [found] : [];
    });
    return [...yours(), ...bundled];
  };
  const get = (id: string): Result<SkillInfoDto> => {
    const found = list().find((skill) => skill.id === id);
    return found ? ok(found) : fail("not_found", `No skill "${id}".`);
  };
  return { rawOf, yours, list, get };
}

/** Reading: one skill's text, what the model gets, what a message calls for. */
function readSkills(deps: Deps, files: Files) {
  const { rawOf, yours, list, get } = catalogue(deps, files);
  const text = (id: string): Result<{ text: string; editable: boolean }> => {
    const raw = rawOf(id);
    return raw === null ? fail("not_found", `No skill "${id}".`) : ok({ text: raw, editable: slugOf(id) !== null });
  };
  /** What the model reads of a skill: its instructions without the front matter, clipped. Null for an unknown, switched-off or malformed one. */
  const load = (id: string): string | null => {
    if (deps.off().includes(id)) return null;
    const raw = rawOf(id);
    const parsed = raw ? parseSkill(raw, { vendored: slugOf(id) === null }) : null;
    return parsed?.ok ? parsed.value.body.slice(0, SKILL_CHAR_LIMIT) : null;
  };
  /** Your enabled skills with their trigger words, and the ids switched off. */
  const forSelection = (): { yours: { id: string; triggers: string[] }[]; off: ReadonlySet<string> } => ({
    yours: yours().filter((s) => s.enabled).map((s) => ({ id: s.id, triggers: s.triggers })),
    off: new Set(deps.off()),
  });
  return { list, get, text, load, forSelection };
}

/** Writing: add, edit, delete and bring back yours; switch any on or off. Bundled files are never touched. */
function editSkills(deps: Deps, files: Files, get: (id: string) => Result<SkillInfoDto>) {
  const create = (raw: string): Result<SkillInfoDto> => {
    const parsed = parseSkill(raw);
    if (!parsed.ok) return parsed;
    if (files.has(parsed.value.name)) return fail("conflict", `You already have a skill named "${parsed.value.name}". Edit it instead.`);
    files.write(parsed.value.name, raw);
    return get(userId(parsed.value.name));
  };
  const update = (id: string, raw: string): Result<SkillInfoDto> => {
    const slug = slugOf(id);
    if (!slug || !files.has(slug)) return fail("not_found", `No skill of yours called "${id}".`);
    const parsed = parseSkill(raw);
    if (!parsed.ok) return parsed;
    if (parsed.value.name !== slug) return fail("conflict", `The name can't change here (it is "${slug}"). Add a new skill instead.`);
    files.write(slug, raw);
    return get(id);
  };
  const remove = (id: string): Result<{ id: string }> => {
    const slug = slugOf(id);
    if (!slug || !files.has(slug)) return fail("not_found", `No skill of yours called "${id}".`);
    files.trash(slug);
    return ok({ id });
  };
  const restore = (id: string): Result<SkillInfoDto> => {
    const slug = slugOf(id);
    if (!slug || !files.hasTrash(slug)) return fail("not_found", "Nothing to bring back.");
    if (files.has(slug)) return fail("conflict", `You already have a skill named "${slug}".`);
    files.untrash(slug);
    return get(id);
  };
  const setEnabled = (id: string, enabled: boolean): Result<SkillInfoDto> => {
    const found = get(id);
    if (!found.ok) return found;
    if (found.value.locked) return fail("conflict", "This skill always runs. It can't be switched off.");
    const off = new Set(deps.off());
    if (enabled) off.delete(id);
    else off.add(id);
    deps.setOff([...off]);
    return get(id);
  };
  return { create, update, remove, restore, setEnabled };
}

/** Bundled and your own skills (N3). */
export function createSkillsService(deps: Deps) {
  const files = userFiles(deps.userDir);
  const reading = readSkills(deps, files);
  return { ...reading, ...editSkills(deps, files, reading.get) };
}

export type SkillsService = ReturnType<typeof createSkillsService>;
