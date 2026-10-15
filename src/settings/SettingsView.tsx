import { Separator } from "@radix-ui/themes";
import type { Preference } from "../theme/appearance";
import { AppearanceSettings } from "./AppearanceSettings";
import { BrainSettings } from "./BrainSettings";
import "./settings.css";

type Props = {
  active: boolean;
  onSaved: () => void;
  preference: Preference;
  onPreference: (next: Preference) => void;
};

export function SettingsView({ active, onSaved, preference, onPreference }: Props) {
  return (
    <div className="settings">
      <AppearanceSettings preference={preference} onPreference={onPreference} />
      <Separator size="4" />
      <BrainSettings active={active} onSaved={onSaved} />
    </div>
  );
}
