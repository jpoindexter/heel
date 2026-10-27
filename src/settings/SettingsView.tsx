import { Separator } from "@radix-ui/themes";
import type { Preference } from "../theme/appearance";
import { client } from "../api/default-client";
import { EmailSettings } from "../inbox/EmailSettings";
import type { Density } from "../theme/density";
import { ActivitySettings } from "./ActivitySettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { AttentionSettings } from "./AttentionSettings";
import { NoticeSettings } from "./NoticeSettings";
import { SkillsSettings } from "./SkillsSettings";
import { BrainSettings } from "./BrainSettings";
import { DebugSettings } from "./DebugSettings";
import { DensitySettings } from "./DensitySettings";
import { MethodSettings } from "./MethodSettings";
import "./settings.css";

type Props = {
  active: boolean;
  onSaved: () => void;
  preference: Preference;
  onPreference: (next: Preference) => void;
  density: Density;
  onDensity: (next: Density) => void;
};

export function SettingsView({ active, onSaved, preference, onPreference, density, onDensity }: Props) {
  return (
    <div className="settings">
      <AppearanceSettings preference={preference} onPreference={onPreference} />
      <Separator size="4" />
      <DensitySettings density={density} onDensity={onDensity} />
      <Separator size="4" />
      <ActivitySettings />
      <Separator size="4" />
      <NoticeSettings />
      <Separator size="4" />
      <MethodSettings />
      <Separator size="4" />
      <AttentionSettings />
      <Separator size="4" />
      <BrainSettings active={active} onSaved={onSaved} />
      <Separator size="4" />
      <SkillsSettings active={active} />
      <Separator size="4" />
      <EmailSettings client={client} active={active} />
      <Separator size="4" />
      <DebugSettings active={active} />
    </div>
  );
}
