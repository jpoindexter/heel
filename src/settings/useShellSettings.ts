import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { parseShellSettings, SHELL_DEFAULTS, shellRefusal, type ShellSettings } from "./shell-settings-model";

const COMMANDS: Readonly<Record<keyof ShellSettings, string>> = { alwaysOnTop: "set_always_on_top", dockIcon: "set_dock_icon", hotkey: "set_hotkey" };

/** The settings the shell keeps itself (the panel's level, the Dock icon): read once, written through the shell. A write it refuses puts the switch back and says why. */
export function useShellSettings() {
  const [settings, setSettings] = useState<ShellSettings>(SHELL_DEFAULTS);
  const [refused, setRefused] = useState<string | null>(null);
  useEffect(() => {
    void invoke("shell_settings")
      .then((payload) => setSettings(parseShellSettings(payload)))
      .catch(() => undefined);
  }, []);
  const write = <K extends keyof ShellSettings>(which: K, value: ShellSettings[K], args: Record<string, unknown>) => {
    setRefused(null);
    let previous: ShellSettings[K] | undefined;
    setSettings((current) => ((previous = current[which]), { ...current, [which]: value }));
    void invoke(COMMANDS[which], args).catch((error: unknown) => {
      setSettings((current) => ({ ...current, [which]: previous ?? SHELL_DEFAULTS[which] }));
      setRefused(shellRefusal(which, error));
    });
  };
  return {
    settings,
    refused,
    setAlwaysOnTop: (on: boolean) => write("alwaysOnTop", on, { on }),
    setDockIcon: (on: boolean) => write("dockIcon", on, { on }),
    setHotkey: (hotkey: string) => write("hotkey", hotkey, { hotkey }),
  };
}
