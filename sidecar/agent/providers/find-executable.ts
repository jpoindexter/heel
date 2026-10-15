import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

export type FindExecutable = (name: string) => Promise<string | undefined>;

/** Look in an env override, common install dirs, then PATH (a desktop app often has a short PATH). */
export async function findExecutable(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): Promise<string | undefined> {
  const candidates = [
    env[`HEEL_${name.toUpperCase()}_PATH`],
    join(home, ".local", "bin", name),
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`,
    ...(env.PATH ?? "").split(delimiter).filter(Boolean).map((dir) => join(dir, name)),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // not here; keep looking
    }
  }
  return undefined;
}
