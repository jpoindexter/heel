import { Heading, SegmentedControl, Text } from "@radix-ui/themes";
import { ACTIVITIES, type Activity } from "../mascot/life/config";
import { isActivity } from "../mascot/life/activity";
import { useActivity } from "../mascot/life/useActivity";

const LABELS: Record<Activity, string> = { off: "Off", calm: "Calm", lively: "Lively" };
const HELP: Record<Activity, string> = {
  off: "Greg sits still and never wanders.",
  calm: "Now and then he looks around, waves, lies down, and sleeps when you are away.",
  lively: "More often, and he naps sooner.",
};

/** How much Greg does on his own. He is always still while the panel is open or when reduced motion is on. */
export function ActivitySettings() {
  const [activity, setActivity] = useActivity();
  return (
    <section aria-labelledby="activity-heading" className="settings-section">
      <Heading as="h2" id="activity-heading" size="2">Greg's activity</Heading>
      <SegmentedControl.Root value={activity} onValueChange={(value) => isActivity(value) && setActivity(value)} aria-label="Greg's activity">
        {ACTIVITIES.map((choice) => (
          <SegmentedControl.Item key={choice} value={choice}>{LABELS[choice]}</SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
      <Text as="p" size="1" color="gray">{HELP[activity]}</Text>
    </section>
  );
}
