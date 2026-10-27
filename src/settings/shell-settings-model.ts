import { z } from "zod";

/** What the shell saves in shell-settings.json (src-tauri/src/shell_settings.rs); the same defaults as there. */
export const ShellSettingsSchema = z.object({ alwaysOnTop: z.boolean(), dockIcon: z.boolean() });
export type ShellSettings = z.infer<typeof ShellSettingsSchema>;
export const SHELL_DEFAULTS: ShellSettings = { alwaysOnTop: false, dockIcon: true };

/** The shell's answer, or the defaults when it is not there (a browser tab, an older shell). */
export function parseShellSettings(payload: unknown): ShellSettings {
  const parsed = ShellSettingsSchema.safeParse(payload);
  return parsed.success ? parsed.data : SHELL_DEFAULTS;
}

/** The switches the shell owns: the two in shell-settings.json and the macOS login item. */
export type ShellSwitch = keyof ShellSettings | "launchAtLogin";

const COULDNT: Readonly<Record<ShellSwitch, string>> = {
  alwaysOnTop: "Couldn't keep the panel on top.",
  dockIcon: "Couldn't change the Dock icon.",
  launchAtLogin: "Couldn't change whether Heel opens when you log in.",
};

/** A switch the shell refused: what did not happen, in the person's words, with the shell's own words after it for anyone who asks. */
export function shellRefusal(which: ShellSwitch, error: unknown): string {
  const raw = String(error instanceof Error ? error.message : error).trim();
  return raw ? `${COULDNT[which]} (${raw})` : COULDNT[which];
}
