import { Heading, Switch, Text } from "@radix-ui/themes";
import { useShellSettings } from "./useShellSettings";

/** The panel's level once it is parked away from Greg (B9). Docked, it always floats with him. */
export function PanelSettings() {
  const { settings, setAlwaysOnTop } = useShellSettings();
  return (
    <section aria-labelledby="panel-heading" className="settings-section">
      <Heading as="h3" id="panel-heading" size="2">Panel</Heading>
      <Text as="label" size="2" className="attention-switch">
        <Switch size="1" checked={settings.alwaysOnTop} onCheckedChange={setAlwaysOnTop} /> Always on top
      </Text>
      <Text as="p" size="1" color="gray">Next to Greg the panel floats with him. Dragged away, it is an ordinary window other apps can cover; this keeps it floating anyway.</Text>
    </section>
  );
}
