import type { ApiResult } from "../../shared/api";

/** An Undo that the helper refuses must say so: a row that quietly fails to come back reads as lost. `run` answers the refusal sentence, or null; `then` runs either way (the list reloads). */
export function undoSaid(run: () => Promise<string | null>, fail: (message: string) => void, then: () => Promise<void> = async () => undefined): () => void {
  return () =>
    void run().then((refused) => {
      if (refused) fail(refused);
      return then();
    });
}

/** The same for a helper call: the refusal is the error's message. */
export function undoThen(run: () => Promise<ApiResult<unknown>>, refresh: () => Promise<void>, fail: (message: string) => void): () => void {
  return undoSaid(() => run().then((result) => (result.ok ? null : result.error.message)), fail, refresh);
}
