import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONNECTION_FILE, ConnectionInfoSchema, TOKEN_HEADER, type ConnectionInfo } from "../../shared/api";

const DIR_MODE = 0o700;
const FILE_MODE = 0o600;
const PROBE_TIMEOUT_MS = 1_500;

/**
 * The panel learns the port and token by reading this file (through the shell). Only this user can read it,
 * and a web page cannot, which is what stops a website from calling the local server.
 */
export function writeConnectionFile(dir: string, info: ConnectionInfo): string {
  mkdirSync(dir, { recursive: true, mode: DIR_MODE });
  const path = join(dir, CONNECTION_FILE);
  writeFileSync(path, JSON.stringify(info), { mode: FILE_MODE });
  return path;
}

export function readConnectionFile(dir: string): ConnectionInfo | null {
  try {
    const parsed = ConnectionInfoSchema.safeParse(JSON.parse(readFileSync(join(dir, CONNECTION_FILE), "utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Delete the file only if it is still ours. A second helper must never remove the first one's file. */
export function removeConnectionFile(dir: string, ownToken: string): void {
  if (readConnectionFile(dir)?.token !== ownToken) return;
  rmSync(join(dir, CONNECTION_FILE), { force: true });
}

/**
 * Is another helper already serving from this data dir? A leftover file from a crash does not count:
 * the recorded port must actually answer /health with the recorded token.
 */
export async function findRunningHelper(dir: string, doFetch: typeof fetch = fetch): Promise<ConnectionInfo | null> {
  const info = readConnectionFile(dir);
  if (!info) return null;
  try {
    const response = await doFetch(`http://127.0.0.1:${info.port}/health`, {
      headers: { [TOKEN_HEADER]: info.token },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return response.ok ? info : null;
  } catch {
    return null;
  }
}
