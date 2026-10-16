import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Heading, Switch, Text } from "@radix-ui/themes";
import { setSystemToasts, systemToastsOn } from "../ui/system-toasts";

/** Where a notice shows when the panel is closed: Greg's bubble always, and Notification Center too unless turned off. */
export function NoticeSettings() {
  const [on, setOn] = useState(systemToastsOn);
  const [said, setSaid] = useState<string | null>(null);
  /** One real notification, and macOS's own answer in words, so "nothing appeared" always has a reason. */
  const test = () =>
    void invoke("system_notify", { title: "Heel", body: "This is a test notice." })
      .then(() => setSaid("Sent. If no banner appeared, check System Settings > Notifications > Heel, and Focus."))
      .catch((error: unknown) => setSaid(String(error)));
  return (
    <section aria-labelledby="notices-heading" className="settings-section">
      <Heading as="h2" id="notices-heading" size="2">Notices</Heading>
      <Text as="label" size="2" className="attention-switch">
        <Switch size="1" checked={on} onCheckedChange={(next) => (setOn(next), setSystemToasts(next))} /> Also show in Notification Center
      </Text>
      <Text as="p" size="1" color="gray">When the panel is closed, a notice appears next to Greg. This adds the Mac's own notification, text only. Never during Quiet mode or a time-box.</Text>
      <div className="skill-actions">
        <Button size="1" variant="soft" radius="full" onClick={test}>Send a test notice</Button>
      </div>
      {said && <Text as="p" size="1" color="gray" role="status">{said}</Text>}
    </section>
  );
}
