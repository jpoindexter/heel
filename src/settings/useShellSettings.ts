import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { parseShellSettings, SHELL_DEFAULTS, type ShellSettings } from "./shell-settings-model";

/** The settings the shell keeps itself (the panel's level, the Dock icon): read once, written through the shell. */
export function useShellSettings() {
  const [settings, setSettings] = useState<ShellSettings>(SHELL_DEFAULTS);
  useEffect(() => {
    void invoke("shell_settings")
      .then((payload) => setSettings(parseShellSettings(payload)))
      .catch(() => undefined);
  }, []);
  const setAlwaysOnTop = (on: boolean) => {
    setSettings((current) => ({ ...current, alwaysOnTop: on }));
    void invoke("set_always_on_top", { on }).catch(() => undefined);
  };
  const setDockIcon = (on: boolean) => {
    setSettings((current) => ({ ...current, dockIcon: on }));
    void invoke("set_dock_icon", { on }).catch(() => undefined);
  };
  return { settings, setAlwaysOnTop, setDockIcon };
}
