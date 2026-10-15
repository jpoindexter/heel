import type { Context } from "hono";
import type { ApiError } from "../../shared/api";

/** Expected failures are values (ok: false) with a sentence a person can act on; HTTP errors are for auth only. */
export const ok = <T>(c: Context, data: T) => c.json({ ok: true as const, data });

export const fail = (c: Context, code: string, message: string) =>
  c.json({ ok: false as const, error: { code, message } satisfies ApiError });

/** Read a JSON body without throwing; a malformed body becomes null so Zod can reject it with a sentence. */
export const readJson = (c: Context): Promise<unknown> => c.req.json().catch(() => null);
