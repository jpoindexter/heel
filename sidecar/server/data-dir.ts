import { homedir } from "node:os";
import { join } from "node:path";
import { APP_ID } from "../../shared/api";

type Env = Record<string, string | undefined>;

/**
 * Where Heel keeps its database and the connection file. On macOS this is the same folder
 * Tauri reports as the app data dir, so the shell and the sidecar agree without talking.
 * HEEL_DATA_DIR overrides it (tests, a second profile).
 */
export function dataDir(env: Env = process.env, home: string = homedir(), platform: string = process.platform): string {
  if (env.HEEL_DATA_DIR) return env.HEEL_DATA_DIR;
  if (platform === "darwin") return join(home, "Library", "Application Support", APP_ID);
  if (platform === "win32") return join(env.APPDATA ?? join(home, "AppData", "Roaming"), APP_ID);
  return join(env.XDG_DATA_HOME ?? join(home, ".local", "share"), APP_ID);
}
