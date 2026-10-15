import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONNECTION_FILE, type ConnectionInfo } from "../../shared/api";

const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

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

export function removeConnectionFile(dir: string): void {
  rmSync(join(dir, CONNECTION_FILE), { force: true });
}
