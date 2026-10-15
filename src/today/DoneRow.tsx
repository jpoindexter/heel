import { ChevronRightIcon } from "@radix-ui/react-icons";
import { Text } from "@radix-ui/themes";
import { doneTodayLine } from "./history-labels";

/** The end of the list: how many got done today, and the way into History. Never a streak, never a score. */
export function DoneRow({ doneToday, onOpen }: { doneToday: number; onOpen: () => void }) {
  return (
    <button type="button" className="done-row" onClick={onOpen}>
      <Text size="1" className="grow">{doneTodayLine(doneToday)} · History</Text>
      <ChevronRightIcon aria-hidden="true" />
    </button>
  );
}
