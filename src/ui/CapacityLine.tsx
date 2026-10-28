import { Button, Flex, Text } from "@radix-ui/themes";
import { reducedLine, type Capacity } from "./capacity";

type Props = { capacity: Capacity; waiting: number; onNormal: () => void };

/** Stands where the rest of the list was on a Low or Off day: says so, counts what waits, and offers the way back. */
export function CapacityLine({ capacity, waiting, onNormal }: Props) {
  return (
    <Flex direction="column" align="center" gap="2" className="tasks-empty in" role="status">
      <Text as="p" size="2" color="gray">{reducedLine(capacity, waiting)}</Text>
      <Button type="button" size="1" variant="ghost" color="gray" onClick={onNormal}>Normal day</Button>
    </Flex>
  );
}
