import { Heading, SegmentedControl, Text } from "@radix-ui/themes";
import { PREFERENCES, isPreference, type Preference } from "../theme/appearance";
import { PREFERENCE_LABELS as LABELS } from "./settings-model";

type Props = { preference: Preference; onPreference: (next: Preference) => void };

/** Light, dark, or follow the Mac. Applies at once. */
export function AppearanceSettings({ preference, onPreference }: Props) {
  return (
    <section aria-labelledby="appearance-heading" className="settings-section">
      <Heading as="h3" id="appearance-heading" size="2">Appearance</Heading>
      <Text as="p" size="1" color="gray">System follows your Mac's light or dark setting.</Text>
      <SegmentedControl.Root value={preference} onValueChange={(value) => isPreference(value) && onPreference(value)} aria-label="Appearance">
        {PREFERENCES.map((choice) => (
          <SegmentedControl.Item key={choice} value={choice}>{LABELS[choice]}</SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
    </section>
  );
}
