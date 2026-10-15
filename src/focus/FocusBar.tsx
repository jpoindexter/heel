import { Button, Card, Text } from "@radix-ui/themes";
import type { FocusDto } from "../../shared/api";
import { endsAtText } from "./focus-model";

/** A box is running: the goal in the person's own words, when it is up, and a plain way out. */
export function FocusBar({ session, onStop }: { session: FocusDto; onStop: () => void }) {
  return (
    <Card size="1" variant="surface" role="region" aria-label="Focus time-box" className="focus-bar">
      <Text size="2" className="focus-line">
        <Text size="1" color="gray" weight="medium" className="focus-label">FOCUS</Text> {session.goal}
        <Text size="1" color="gray" className="focus-until"> · until {endsAtText(session)}</Text>
      </Text>
      <Button size="1" variant="soft" color="gray" onClick={onStop}>Stop box</Button>
    </Card>
  );
}
