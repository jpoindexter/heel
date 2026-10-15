import { Card, Checkbox, Text } from "@radix-ui/themes";
import type { NowCard } from "./today-model";

/** One line: the single thing to do now. The checkbox completes that task (with Undo). */
export function NowStrip({ now, onComplete }: { now: NowCard | null; onComplete: () => void }) {
  if (!now) return null;
  return (
    <Card size="1" variant="surface" role="region" aria-label="Now" className="now-strip">
      <Checkbox size="3" checked={false} aria-label={`Complete: ${now.task.title}`} onCheckedChange={onComplete} />
      <Text size="2" className="now-line">
        <Text size="1" color="gray" weight="medium" className="now-label">NOW</Text> {now.text}
        {now.taskTitle && <Text size="1" color="gray"> · {now.taskTitle}</Text>}
      </Text>
    </Card>
  );
}
