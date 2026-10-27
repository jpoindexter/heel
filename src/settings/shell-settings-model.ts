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
