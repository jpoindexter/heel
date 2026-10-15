import { StoredMessageSchema, type SearchHitDto, type SearchKind } from "../../shared/api";
import type { Ctx } from "./context";

/** Fewer letters than this find nothing: one letter matches everything and means nothing. */
export const SEARCH_MIN_CHARS = 2;
export const SEARCH_LIMIT = 24;

export type Hit = SearchHitDto;

/** How well `text` holds the query: at its start beats at the start of a word, which beats anywhere; nothing is 0. */
export function matchScore(query: string, text: string | null): number {
  if (!text) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const at = t.indexOf(q);
  if (at < 0) return 0;
  if (at === 0) return 3;
  return /\s/.test(t[at - 1] ?? "") ? 2 : 1;
}

/** Open things before finished ones, finished before what was said. */
export const KIND_ORDER: Readonly<Record<SearchKind, number>> = { task: 0, parked: 1, done: 2, said: 3 };

/** The title's match counts far more than the body's; then open beats finished; then newer beats older. */
export function rank(query: string, candidates: readonly Hit[]): Hit[] {
  const scored = candidates
    .map((hit) => ({ hit, score: matchScore(query, hit.text) * 10 + matchScore(query, hit.detail) }))
    .filter(({ score }) => score > 0);
  scored.sort((a, b) => b.score - a.score || KIND_ORDER[a.hit.kind] - KIND_ORDER[b.hit.kind] || b.hit.at - a.hit.at);
  return scored.slice(0, SEARCH_LIMIT).map(({ hit }) => hit);
}

const like = (query: string) => `%${query.replace(/[\\%_]/g, "\\$&")}%`;

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? null : String(v));
const num = (v: unknown) => Number(v ?? 0);

function taskHits(ctx: Ctx, pattern: string): Hit[] {
  const open = ctx.db.prepare("SELECT * FROM tasks WHERE status IN ('todo', 'doing') AND (title LIKE ? ESCAPE '\\' OR now_step LIKE ? ESCAPE '\\')").all(pattern, pattern) as Row[];
  const done = ctx.db.prepare("SELECT * FROM tasks WHERE status = 'done' AND title LIKE ? ESCAPE '\\'").all(pattern) as Row[];
  return [
    ...open.map((r): Hit => ({ kind: "task", id: String(r.id), text: String(r.title), detail: str(r.now_step), at: num(r.updated_at) })),
    ...done.map((r): Hit => ({ kind: "done", id: String(r.id), text: String(r.title), detail: null, at: num(r.completed_at ?? r.updated_at) })),
  ];
}

function parkedHits(ctx: Ctx, pattern: string): Hit[] {
  const rows = ctx.db.prepare("SELECT * FROM parked WHERE promoted_task_id IS NULL AND (idea LIKE ? ESCAPE '\\' OR why LIKE ? ESCAPE '\\')").all(pattern, pattern) as Row[];
  return rows.map((r): Hit => ({ kind: "parked", id: String(r.id), text: String(r.idea), detail: str(r.why), at: num(r.created_at) }));
}

/** What was said, by either side; a row from a broken or future version is skipped. */
function saidHits(ctx: Ctx, pattern: string): Hit[] {
  const rows = ctx.db.prepare("SELECT client_id, payload, created_at FROM messages WHERE cleared_at IS NULL AND payload LIKE ? ESCAPE '\\'").all(pattern) as Row[];
  return rows.flatMap((r): Hit[] => {
    try {
      const parsed = StoredMessageSchema.safeParse(JSON.parse(String(r.payload)));
      if (!parsed.success) return [];
      const m = parsed.data;
      const text = m.role === "user" ? m.text : m.status === "said" ? m.say : null;
      return text ? [{ kind: "said", id: String(r.client_id), text, detail: m.role === "user" ? "You" : "Heel", at: num(r.created_at) }] : [];
    } catch {
      return [];
    }
  });
}

/** Everything that holds the query, ranked. Case does not matter; `%` and `_` in the query are plain letters. */
export function search(ctx: Ctx, query: string): Hit[] {
  const q = query.trim();
  if (q.length < SEARCH_MIN_CHARS) return [];
  const pattern = like(q);
  return rank(q, [...taskHits(ctx, pattern), ...parkedHits(ctx, pattern), ...saidHits(ctx, pattern)]);
}
