import type { SearchHitDto, SearchKind } from "../../shared/api";

export const SEARCH_DEBOUNCE_MS = 150;
/** Fewer letters find nothing (the helper says the same). */
export const SEARCH_MIN_CHARS = 2;
/** How long a row found from search stays tinted on the list. */
export const FOUND_MS = 2_000;

export const GROUP_LABELS: Readonly<Record<SearchKind, string>> = { task: "Tasks", parked: "Parked", document: "Documents", done: "Done", said: "Said" };
const ORDER: readonly SearchKind[] = ["task", "parked", "document", "done", "said"];

export type Group = { kind: SearchKind; label: string; hits: SearchHitDto[] };

/** The hits by kind, in the order the list shows them (the helper's ranking order is kept inside each group). */
export function groupHits(hits: readonly SearchHitDto[]): Group[] {
  return ORDER.map((kind) => ({ kind, label: GROUP_LABELS[kind], hits: hits.filter((hit) => hit.kind === kind) })).filter((group) => group.hits.length > 0);
}

/** Up and down over the whole list, wrapping at the ends; nothing to move over stays at nothing. */
export function moveIndex(index: number, delta: 1 | -1, count: number): number {
  if (count === 0) return -1;
  return (((index < 0 ? (delta > 0 ? -1 : 0) : index) + delta) % count + count) % count;
}

export const hint = (query: string): string =>
  query.trim().length < SEARCH_MIN_CHARS ? "Type to find a task, a parked idea, something finished or something said." : `Nothing holds “${query.trim()}”. Try another word.`;
