import { useId } from "react";
import { Heading, Switch, Text, TextArea } from "@radix-ui/themes";
import { undoSaid } from "../ui/undo-said";
import { useAttentionSettings } from "../ui/attention";
import { useNotices } from "../ui/notices";
import { parseWanderList } from "./settings-model";

/** The switch, the exact list of what is read, and the apps where the person wanders. Off by default. */
export function AttentionSettings() {
  const { settings, change } = useAttentionSettings();
  const notices = useNotices();
  const listId = useId();
  const fail = (message: string) => notices.show({ message, tone: "error" });
  const apply = (next: typeof settings, said: string) => {
    const previous = settings;
    void change(next).then((refused) => {
      if (refused) return fail(refused);
      notices.show({ message: said, tone: "info", undo: undoSaid(() => change(previous), fail) });
    });
  };
  return (
    <section aria-labelledby="attention-heading" className="settings-section">
      <Heading as="h3" id="attention-heading" size="2">Attention</Heading>
      <Text as="label" size="2" className="attention-switch">
        <Switch size="1" checked={settings.enabled} onCheckedChange={(enabled) => apply({ ...settings, enabled }, enabled ? "Attention sense on" : "Attention sense off")} /> Greg notices rabbit holes, time sucks and drifting
      </Text>
      <Text as="p" size="1" color="gray">
        Heel reads which app is in front and how long since you last touched the mouse or keyboard. Nothing else. Nothing leaves this Mac; today's minutes per app show in History.
      </Text>
      <Text as="label" size="1" color="gray" htmlFor={listId}>Where you wander (bundle ids, one per line)</Text>
      <TextArea
        key={settings.wanderBundles.join("\n")}
        id={listId}
        size="1"
        rows={4}
        defaultValue={settings.wanderBundles.join("\n")}
        onBlur={(event) => {
          const wanderBundles = parseWanderList(event.target.value);
          if (wanderBundles.join("\n") !== settings.wanderBundles.join("\n")) apply({ ...settings, wanderBundles }, "Wander list changed");
        }}
      />
    </section>
  );
}
