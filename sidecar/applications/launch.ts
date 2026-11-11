// Adapted from Vanta vanta-ts/src/browser/launch.ts; keep Heel's browser profile separate.
import { existsSync } from "node:fs";
import type { chromium } from "playwright-core";

const SYSTEM_CHROMIUM: Partial<Record<NodeJS.Platform, string[]>> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/brave-browser", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
};

export function resolveChromiumExecutable(
  browser: Pick<typeof chromium, "executablePath">,
  options: { env?: NodeJS.ProcessEnv; exists?: (path: string) => boolean; platform?: NodeJS.Platform } = {},
): string | undefined {
  const explicit = (options.env ?? process.env).HEEL_BROWSER_EXECUTABLE?.trim();
  if (explicit) return explicit;
  const exists = options.exists ?? existsSync;
  const bundled = browser.executablePath();
  if (bundled && exists(bundled)) return undefined;
  return SYSTEM_CHROMIUM[options.platform ?? process.platform]?.find(exists);
}
