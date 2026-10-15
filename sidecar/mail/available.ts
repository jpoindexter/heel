import { existsSync } from "node:fs";

const MAIL_APP_PATHS = ["/System/Applications/Mail.app", "/Applications/Mail.app"];

/** Is Apple Mail on this Mac? Checked on disk only: Mail itself is not touched until the person asks for mail. */
export function mailAppExists(platform = process.platform, exists = existsSync): boolean {
  return platform === "darwin" && MAIL_APP_PATHS.some((p) => exists(p));
}
