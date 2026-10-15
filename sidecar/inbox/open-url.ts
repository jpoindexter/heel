import { execFile } from "node:child_process";

/** Open a page in the person's default browser (macOS). */
export function openUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => execFile("open", [url], (error) => (error ? reject(error) : resolve())));
}
