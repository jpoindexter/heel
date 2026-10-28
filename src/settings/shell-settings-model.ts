import { z } from "zod";

/** What the shell saves in shell-settings.json (src-tauri/src/shell_settings.rs); the same defaults as there. */
export const DEFAULT_HOTKEY = "super+shift+h";
export const ShellSettingsSchema = z.object({ alwaysOnTop: z.boolean(), dockIcon: z.boolean(), hotkey: z.string().default(DEFAULT_HOTKEY) });
export type ShellSettings = z.infer<typeof ShellSettingsSchema>;
export const SHELL_DEFAULTS: ShellSettings = { alwaysOnTop: false, dockIcon: true, hotkey: DEFAULT_HOTKEY };

/** The shortcuts the panel offers (B1 H2): a short list the shell can register, and Off for a clash with another app. */
export const HOTKEY_CHOICES: readonly { value: string; label: string }[] = [
  { value: "", label: "Off" },
  { value: DEFAULT_HOTKEY, label: "⌘⇧H" },
  { value: "super+shift+g", label: "⌘⇧G" },
  { value: "control+alt+h", label: "⌃⌥H" },
  { value: "control+alt+space", label: "⌃⌥Space" },
  { value: "alt+space", label: "⌥Space" },
];

/** The shell's answer, or the defaults when it is not there (a browser tab, an older shell). */
export function parseShellSettings(payload: unknown): ShellSettings {
  const parsed = ShellSettingsSchema.safeParse(payload);
  return parsed.success ? parsed.data : SHELL_DEFAULTS;
}

/** What the shell owns: the three in shell-settings.json and the macOS login item. */
export type ShellSwitch = keyof ShellSettings | "launchAtLogin";

const COULDNT: Readonly<Record<ShellSwitch, string>> = {
  alwaysOnTop: "Couldn't keep the panel on top.",
  dockIcon: "Couldn't change the Dock icon.",
  hotkey: "Couldn't change the shortcut.",
  launchAtLogin: "Couldn't change whether Heel opens when you log in.",
};

/** A switch the shell refused: what did not happen, in the person's words, with the shell's own words after it for anyone who asks. */
export function shellRefusal(which: ShellSwitch, error: unknown): string {
  const raw = String(error instanceof Error ? error.message : error).trim();
  return raw ? `${COULDNT[which]} (${raw})` : COULDNT[which];
}
