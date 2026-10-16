import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { DocumentDto } from "../../shared/api";
import type { Ctx } from "./context";
import { fail, ok, type Result } from "./result";
import { firstIssue } from "./schema";

const MAX_TITLE = 200;
const MAX_BODY = 60_000;
const SLUG_MAX = 48;
const ID_IN_NAME = 8;

export const NewDocumentInput = z.object({ title: z.string().trim().min(1).max(MAX_TITLE), body: z.string().trim().min(1).max(MAX_BODY) });

const Row = z.object({ id: z.string(), title: z.string(), path: z.string().nullable(), created_at: z.number(), deleted_at: z.number().nullable() });
/** The PDF sits next to the .md with the same name. */
export const pdfPathFor = (path: string): string => path.replace(/\.md$/, "") + ".pdf";

const toDocument = (row: unknown): DocumentDto => {
  const r = Row.parse(row);
  const pdf = r.path ? pdfPathFor(r.path) : null;
  return { id: r.id, title: r.title, path: r.path, pdfPath: pdf && existsSync(pdf) ? pdf : null, createdAt: r.created_at };
};

/** A file name a person can read in Finder: the title's words, then a piece of the id so two "Notes" never collide. */
export function fileNameFor(title: string, id: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, SLUG_MAX).replace(/-+$/g, "") || "document";
  return `${slug}-${id.replace(/-/g, "").slice(0, ID_IN_NAME)}.md`;
}

/** The handover copy: the title as a heading, then the body as Heel wrote it. */
export const fileText = (title: string, body: string): string => `# ${title}\n\n${body}\n`;

function getDocument(ctx: Ctx, id: string): Result<DocumentDto> {
  const row = ctx.db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  return row ? ok(toDocument(row)) : fail("not_found", `No document with id ${id}.`);
}

/** Documents Heel wrote: the row (body kept for search and restore) and, when a folder is known, the .md file. */
export function documentsRepository(ctx: Ctx, dir: string | null) {
  const create = (input: unknown): Result<DocumentDto> => {
    const parsed = NewDocumentInput.safeParse(input);
    if (!parsed.success) return fail("invalid", firstIssue(parsed.error));
    const id = ctx.newId();
    let path: string | null = null;
    if (dir) {
      try {
        mkdirSync(dir, { recursive: true });
        path = join(dir, fileNameFor(parsed.data.title, id));
        writeFileSync(path, fileText(parsed.data.title, parsed.data.body), "utf8");
      } catch (error) {
        return fail("conflict", `Couldn't write the document file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    ctx.db.prepare("INSERT INTO documents (id, title, body, path, created_at) VALUES (?, ?, ?, ?, ?)").run(id, parsed.data.title, parsed.data.body, path, ctx.now());
    return getDocument(ctx, id);
  };
  const list = (): DocumentDto[] => ctx.db.prepare("SELECT * FROM documents WHERE deleted_at IS NULL ORDER BY created_at DESC, rowid DESC").all().map(toDocument);
  /** Soft: the row hides and the file stays, so Undo is a flag, never a rewrite. */
  const remove = (id: string): Result<DocumentDto> => {
    const found = getDocument(ctx, id);
    if (!found.ok) return found;
    ctx.db.prepare("UPDATE documents SET deleted_at = ? WHERE id = ?").run(ctx.now(), id);
    return getDocument(ctx, id);
  };
  const restore = (id: string): Result<DocumentDto> => {
    const found = getDocument(ctx, id);
    if (!found.ok) return found;
    ctx.db.prepare("UPDATE documents SET deleted_at = NULL WHERE id = ?").run(id);
    return getDocument(ctx, id);
  };
  const body = (id: string): string | null => {
    const row = ctx.db.prepare("SELECT body FROM documents WHERE id = ?").get(id);
    return row ? String(row.body) : null;
  };
  /** The newest document whose title holds `hint`, or the newest at all. */
  const latest = (hint?: string | null): DocumentDto | null => {
    const docs = list();
    const wanted = hint?.trim().toLowerCase();
    return (wanted ? docs.find((d) => d.title.toLowerCase().includes(wanted)) : undefined) ?? docs[0] ?? null;
  };
  return { create, list, get: (id: string) => getDocument(ctx, id), remove, restore, body, latest };
}
