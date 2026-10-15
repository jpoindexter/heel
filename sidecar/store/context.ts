import type { DatabaseSync } from "node:sqlite";

/** Everything a repository needs. Clock and id source are injected so tests are deterministic. */
export type Ctx = {
  db: DatabaseSync;
  now: () => number;
  newId: () => string;
};

export function inTransaction<T>(ctx: Ctx, run: () => T): T {
  ctx.db.exec("BEGIN");
  try {
    const value = run();
    ctx.db.exec("COMMIT");
    return value;
  } catch (error) {
    ctx.db.exec("ROLLBACK");
    throw error;
  }
}
