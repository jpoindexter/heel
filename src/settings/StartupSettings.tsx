import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Heading, Select, Switch, Text } from "@radix-ui/themes";
import { HOTKEY_CHOICES, shellRefusal } from "./shell-settings-model";
import { loginNote, parseLoginStatus, type LoginStatus } from "./startup-model";
import { useShellSettings } from "./useShellSettings";

const openDataFolder = () => void invoke("reveal_data_folder").catch(() => undefined);

/** Launch at login (a macOS login item), Heel in the Dock, and where the data lives (N10). */
export function StartupSettings() {
  const { settings, refused: shellRefused, setDockIcon, setHotkey } = useShellSettings();
  const [login, setLogin] = useState<LoginStatus>("off");
  const [refused, setRefused] = useState<string | null>(null);
  useEffect(() => {
    void invoke("launch_at_login").then((payload) => setLogin(parseLoginStatus(payload))).catch(() => undefined);
  }, []);
  const changeLogin = (on: boolean) => {
    setRefused(null);
    void invoke("set_launch_at_login", { on })
      .then((payload) => setLogin(parseLoginStatus(payload)))
      .catch((error: unknown) => setRefused(shellRefusal("launchAtLogin", error)));
  };
  const note = loginNote(login);
  return (
    <section aria-labelledby="startup-heading" className="settings-section">
      <Heading as="h3" id="startup-heading" size="2">General</Heading>
      <Text as="label" size="2" className="attention-switch">
        <Switch size="1" checked={login !== "off"} onCheckedChange={changeLogin} /> Open Heel when you log in
      </Text>
      {refused ? <Text as="p" size="1" color="amber" role="alert">{refused}</Text> : note && <Text as="p" size="1" color="gray" role="status">{note}</Text>}
      <Text as="label" size="2" className="attention-switch">
        <Switch size="1" checked={settings.dockIcon} onCheckedChange={setDockIcon} /> Show Heel in the Dock
      </Text>
      <Text as="p" size="1" color="gray">Off, Heel lives in the menu bar and as Greg only.</Text>
      <div className="field">
        <Text as="label" size="2" weight="medium" id="hotkey-label">Panel shortcut</Text>
        <Select.Root value={settings.hotkey} onValueChange={setHotkey}>
          <Select.Trigger id="hotkey" aria-labelledby="hotkey-label" aria-describedby="hotkey-help" />
          <Select.Content>
            {HOTKEY_CHOICES.map((choice) => (
              <Select.Item key={choice.value || "off"} value={choice.value}>{choice.label}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Text as="p" id="hotkey-help" size="1" color="gray">Off if it clashes with another app's shortcut (dictation, push-to-talk). The menu bar and Greg still open the panel.</Text>
      </div>
      {shellRefused && <Text as="p" size="1" color="amber" role="alert">{shellRefused}</Text>}
      <div className="skill-actions">
        <Button size="1" variant="soft" radius="full" onClick={openDataFolder}>Show data folder</Button>
      </div>
    </section>
  );
}
