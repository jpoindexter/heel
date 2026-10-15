import { pathToFileURL } from "node:url";

/** Where the nd-skills live: next to the source in development, or wherever the packaged app put them (HEEL_SKILLS_DIR). */
export function skillsDir(env: Record<string, string | undefined>, fallback: URL): URL {
  const override = env.HEEL_SKILLS_DIR?.trim();
  if (!override) return fallback;
  const dir = pathToFileURL(override);
  return dir.href.endsWith("/") ? dir : new URL(`${dir.href}/`);
}
