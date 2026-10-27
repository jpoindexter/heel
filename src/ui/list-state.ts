import type { ApiResult } from "../../shared/api";

/** A list and, when its last load failed, why. Stale beats blank, and blank must never read as "none yet". */
export type ListState<T> = { items: T[]; problem: string | null };
export const EMPTY_LIST: ListState<never> = { items: [], problem: null };

/** What a load leaves: the fresh list; or what was shown, with the error beside it. */
export function afterListLoad<T, D>(current: ListState<T>, result: ApiResult<D>, pick: (data: D) => T[]): ListState<T> {
  return result.ok ? { items: pick(result.data), problem: null } : { ...current, problem: result.error.message };
}
