import { useState } from "react";
import { Heading, Switch, Text } from "@radix-ui/themes";
import { setSystemToasts, systemToastsOn } from "../ui/system-toasts";

/** Where a notice shows when the panel is closed: Greg's bubble always, and Notification Center too unless turned off. */
export function NoticeSettings() {
  const [on, setOn] = useState(systemToastsOn);
  return (
    <section aria-labelledby="notices-heading" className="settings-section">
      <Heading as="h2" id="notices-heading" size="2">Notices</Heading>
      <Text as="label" size="2" className="attention-switch">
        <Switch size="1" checked={on} onCheckedChange={(next) => (setOn(next), setSystemToasts(next))} /> Also show in Notification Center
      </Text>
      <Text as="p" size="1" color="gray">When the panel is closed, a notice appears next to Greg. This adds the Mac's own notification, text only. Never during Quiet mode or a time-box.</Text>
    </section>
  );
}
