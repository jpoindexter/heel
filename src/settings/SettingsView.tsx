import { useState } from "react";
import type { Preference } from "../theme/appearance";
import { APP_VERSION } from "../../shared/version";
import { client } from "../api/default-client";
import { EmailSettings } from "../inbox/EmailSettings";
import { useActivity } from "../mascot/life/useActivity";
import type { Density } from "../theme/density";
import { useAttentionSettings } from "../ui/attention";
import { useMethod } from "../ui/method";
import { setSystemToasts, systemToastsOn } from "../ui/system-toasts";
import { ActivitySettings } from "./ActivitySettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { AttentionSettings } from "./AttentionSettings";
import { NoticeSettings } from "./NoticeSettings";
import { SkillsSettings } from "./SkillsSettings";
import { StartupSettings } from "./StartupSettings";
import { BrainSettings } from "./BrainSettings";
import { DataSettings } from "./DataSettings";
import { DebugSettings } from "./DebugSettings";
import { DensitySettings } from "./DensitySettings";
import { PanelSettings } from "./PanelSettings";
import { MethodSettings } from "./MethodSettings";
import { SettingsGroup } from "./SettingsGroup";
import { gregSummary, lookSummary, workSummary } from "./settings-model";
import "./settings.css";

type Props = {
  active: boolean;
  onSaved: () => void;
  preference: Preference;
  onPreference: (next: Preference) => void;
  density: Density;
  onDensity: (next: Density) => void;
};

/** Two levels (N4): eight groups with their values at rest, each opening to its controls. One group open at a time. */
export function SettingsView({ active, onSaved, preference, onPreference, density, onDensity }: Props) {
  const [activity] = useActivity();
  const { settings: attention } = useAttentionSettings();
  const { method } = useMethod();
  // Held here, not in NoticeSettings: the group row reads it at rest and must change with the switch.
  const [noticesOn, setNoticesOn] = useState(systemToastsOn);
  const changeNotices = (on: boolean) => (setNoticesOn(on), setSystemToasts(on));
  return (
    <div className="settings">
      <SettingsGroup title="Look" summary={lookSummary(preference, density)}>
        <AppearanceSettings preference={preference} onPreference={onPreference} />
        <DensitySettings density={density} onDensity={onDensity} />
        <PanelSettings />
      </SettingsGroup>
      <SettingsGroup title="Greg" summary={gregSummary(activity, noticesOn, attention.enabled)}>
        <ActivitySettings />
        <NoticeSettings on={noticesOn} onChange={changeNotices} />
        <AttentionSettings />
      </SettingsGroup>
      <SettingsGroup title="Ways of working" summary={workSummary(method)}>
        <MethodSettings />
      </SettingsGroup>
      <SettingsGroup title="Brain" summary="AI and skills">
        <BrainSettings active={active} onSaved={onSaved} />
        <SkillsSettings active={active} />
      </SettingsGroup>
      <SettingsGroup title="Email" summary="Gmail, read-only">
        <EmailSettings client={client} active={active} />
      </SettingsGroup>
      <SettingsGroup title="Startup" summary="Login, Dock">
        <StartupSettings />
      </SettingsGroup>
      <SettingsGroup title="Privacy & data" summary="Back up, wipe">
        <DataSettings />
      </SettingsGroup>
      <SettingsGroup title="About" summary={`Heel ${APP_VERSION}`}>
        <DebugSettings active={active} />
      </SettingsGroup>
    </div>
  );
}
