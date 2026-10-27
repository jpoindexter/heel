import type { ApiResult, DigestDto } from "../../shared/api";

export type DigestState = { phase: "idle" } | { phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; digest: DigestDto; added: readonly string[]; /** The last "Add task" the helper refused, in its words; the digest stays. */ error: string | null };

/** After "Add task" on one item: the item is marked added, or the refusal is kept on the card. The digest is never thrown away for one failed row. */
export function afterAddTask(state: DigestState, messageId: string, result: ApiResult<unknown>): DigestState {
  if (state.phase !== "ready") return state;
  if (!result.ok) return { ...state, error: result.error.message };
  return { ...state, added: [...state.added, messageId], error: null };
}
