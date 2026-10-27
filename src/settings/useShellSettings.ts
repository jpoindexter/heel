import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { parseShellSettings, SHELL_DEFAULTS, shellRefusal, type ShellSettings, type ShellSwitch } from "./shell-settings-model";

const COMMANDS: Readonly<Record<ShellSwitch, string>> = { alwaysOnTop: "set_always_on_top", dockIcon: "set_dock_icon" };

/** The settings the shell keeps itself (the panel's level, the Dock icon): read once, written through the shell. A write it refuses puts the switch back and says why. */
export function useShellSettings() {
  const [settings, setSettings] = useState<ShellSettings>(SHELL_DEFAULTS);
  const [refused, setRefused] = useState<string | null>(null);
  useEffect(() => {
    void invoke("shell_settings")
      .then((payload) => setSettings(parseShellSettings(payload)))
      .catch(() => undefined);
  }, []);
  const write = (which: ShellSwitch, on: boolean) => {
    setRefused(null);
    setSettings((current) => ({ ...current, [which]: on }));
    void invoke(COMMANDS[which], { on }).catch((error: unknown) => {
      setSettings((current) => ({ ...current, [which]: !on }));
      setRefused(shellRefusal(which, error));
    });
  };
  return { settings, refused, setAlwaysOnTop: (on: boolean) => write("alwaysOnTop", on), setDockIcon: (on: boolean) => write("dockIcon", on) };
}
