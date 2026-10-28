import { Heading, SegmentedControl, Text } from "@radix-ui/themes";
import { CAPACITIES, isCapacity, type Capacity } from "../ui/capacity";
import { CAPACITY_LABELS as LABELS } from "./settings-model";

const HELP: Record<Capacity, string> = {
  normal: "Everything on.",
  low: "One task at a time, no quick actions, no email. Chat stays.",
  off: "Low, and Greg sits still, no nudges.",
};

type Props = { capacity: Capacity; onCapacity: (next: Capacity) => void };

/** Today's capacity (V1-7): the person sets it, Heel never guesses it. */
export function CapacitySettings({ capacity, onCapacity }: Props) {
  return (
    <section aria-labelledby="capacity-heading" className="settings-section">
      <Heading as="h3" id="capacity-heading" size="2">Today's capacity</Heading>
      <SegmentedControl.Root size="1" value={capacity} onValueChange={(value) => isCapacity(value) && onCapacity(value)} aria-label="Today's capacity">
        {CAPACITIES.map((choice) => (
          <SegmentedControl.Item key={choice} value={choice}>{LABELS[choice]}</SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
      <Text as="p" size="1" color="gray">{HELP[capacity]}</Text>
    </section>
  );
}
