import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Heading, Switch, Text } from "@radix-ui/themes";
import { loginNote, parseLoginStatus, type LoginStatus } from "./startup-model";
import { useShellSettings } from "./useShellSettings";

const openDataFolder = () => void invoke("reveal_data_folder").catch(() => undefined);

/** Launch at login (a macOS login item), Heel in the Dock, and where the data lives (N10). */
export function StartupSettings() {
  const { settings, refused: dockRefused, setDockIcon } = useShellSettings();
  const [login, setLogin] = useState<LoginStatus>("off");
  const [refused, setRefused] = useState<string | null>(null);
  useEffect(() => {
    void invoke("launch_at_login").then((payload) => setLogin(parseLoginStatus(payload))).catch(() => undefined);
  }, []);
  const changeLogin = (on: boolean) => {
    setRefused(null);
    void invoke("set_launch_at_login", { on })
      .then((payload) => setLogin(parseLoginStatus(payload)))
      .catch((error: unknown) => setRefused(String(error)));
  };
  const note = refused ?? loginNote(login);
  return (
    <section aria-labelledby="startup-heading" className="settings-section">
      <Heading as="h3" id="startup-heading" size="2">General</Heading>
      <Text as="label" size="2" className="attention-switch">
        <Switch size="1" checked={login !== "off"} onCheckedChange={changeLogin} /> Open Heel when you log in
      </Text>
      {note && <Text as="p" size="1" color="gray" role="status">{note}</Text>}
      <Text as="label" size="2" className="attention-switch">
        <Switch size="1" checked={settings.dockIcon} onCheckedChange={setDockIcon} /> Show Heel in the Dock
      </Text>
      {dockRefused && <Text as="p" size="1" color="amber" role="alert">{dockRefused}</Text>}
      <Text as="p" size="1" color="gray">Off, Heel lives in the menu bar and as Greg only.</Text>
      <div className="skill-actions">
        <Button size="1" variant="soft" radius="full" onClick={openDataFolder}>Show data folder</Button>
      </div>
    </section>
  );
}
