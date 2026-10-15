import { Button } from "@radix-ui/themes";
import { CHIPS, type Chip } from "./today-model";

type Props = { busy: boolean; onChip: (chip: Chip) => void };

/** Three fixed chips: same place, same order, always. A chip that asks the AI waits while it is thinking. */
export function QuickChips({ busy, onChip }: Props) {
  return (
    <div className="chips" role="group" aria-label="Quick actions">
      {CHIPS.map((chip) => (
        <Button key={chip.id} type="button" size="1" variant="soft" color="gray" disabled={busy && chip.prompt !== null} onClick={() => onChip(chip)}>
          {chip.label}
        </Button>
      ))}
    </div>
  );
}
