export type StoreErrorCode = "invalid" | "not_found" | "conflict";

export type StoreError = { code: StoreErrorCode; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: StoreError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const fail = (code: StoreErrorCode, message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});
