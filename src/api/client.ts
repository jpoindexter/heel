import { invoke } from "@tauri-apps/api/core";
import type { z } from "zod";
import { ConnectionInfoSchema, TOKEN_HEADER, envelope, type ApiResult, type ConnectionInfo } from "../../shared/api";

const OFFLINE: ApiResult<never> = {
  ok: false,
  error: { code: "offline", message: "Heel's helper isn't running. Restart Heel." },
};

const STOPPED: ApiResult<never> = { ok: false, error: { code: "aborted", message: "Stopped." } };

type Fetcher = typeof fetch;
type ReadInfo = () => Promise<ConnectionInfo | null>;

/** The shell reads the helper's connection file for us. In dev, a browser preview may pass ?sidecar=PORT:TOKEN. */
async function readConnectionInfo(): Promise<ConnectionInfo | null> {
  try {
    const raw = await invoke<string>("sidecar_info");
    const parsed = ConnectionInfoSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return readDevOverride();
  }
}

function readDevOverride(): ConnectionInfo | null {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get("sidecar");
  const [port, token] = value?.split(":") ?? [];
  const parsed = ConnectionInfoSchema.safeParse({ port: Number(port), token });
  return parsed.success ? parsed.data : null;
}

export type ClientDeps = { fetch?: Fetcher; readInfo?: ReadInfo };

/** Typed client for the local helper. Every response is validated; failures are values, never thrown. */
export function createClient(deps: ClientDeps = {}) {
  const doFetch = deps.fetch ?? ((...args: Parameters<Fetcher>) => fetch(...args));
  const readInfo = deps.readInfo ?? readConnectionInfo;
  let info: ConnectionInfo | null = null;

  async function send<T extends z.ZodType>(path: string, schema: T, init: RequestInit, retried = false): Promise<ApiResult<z.output<T>>> {
    info ??= await readInfo();
    if (!info) return OFFLINE;
    try {
      const response = await doFetch(`http://127.0.0.1:${info.port}${path}`, {
        ...init,
        headers: { "content-type": "application/json", [TOKEN_HEADER]: info.token, ...init.headers },
      });
      // 401 means the helper restarted with a new token: re-read the file once.
      if (response.status === 401 && !retried) {
        info = null;
        return send(path, schema, init, true);
      }
      const parsed = envelope(schema).safeParse(await response.json());
      if (!parsed.success) return { ok: false, error: { code: "bad_response", message: "Heel's helper sent something unexpected. Restart Heel." } };
      return parsed.data as ApiResult<z.output<T>>;
    } catch {
      if (init.signal?.aborted) return STOPPED;
      info = null;
      return OFFLINE;
    }
  }

  return {
    get: <T extends z.ZodType>(path: string, schema: T) => send(path, schema, { method: "GET" }),
    put: <T extends z.ZodType>(path: string, schema: T, body: unknown) => send(path, schema, { method: "PUT", body: JSON.stringify(body) }),
    patch: <T extends z.ZodType>(path: string, schema: T, body: unknown) => send(path, schema, { method: "PATCH", body: JSON.stringify(body) }),
    /** `signal` lets the caller stop the request; a stopped request answers with code "aborted". */
    post: <T extends z.ZodType>(path: string, schema: T, body?: unknown, signal?: AbortSignal) =>
      send(path, schema, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body), signal }),
  };
}

export type Client = ReturnType<typeof createClient>;
