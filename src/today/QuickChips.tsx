import { Button } from "@radix-ui/themes";
import { CHIPS, type Chip } from "./today-model";

type Props = {
  /** Heel is thinking: the asking chips wait. */
  busy: boolean;
  /** Gmail is connected: a third chip reads recent mail. */
  emailReady: boolean;
  onChip: (chip: Chip) => void;
  onEmail: () => void;
};

/** One quiet row, same place, same order, always: Plan and Stuck ask the AI at once; Email appears only when Gmail is connected. */
export function QuickChips({ busy, emailReady, onChip, onEmail }: Props) {
  return (
    <div className="chips" role="group" aria-label="Quick actions">
      {CHIPS.map((chip) => (
        <Button key={chip.id} type="button" size="1" radius="full" variant="soft" color="gray" disabled={busy} onClick={() => onChip(chip)}>
          {chip.label}
        </Button>
      ))}
      {emailReady && <Button type="button" size="1" radius="full" variant="soft" color="gray" onClick={onEmail}>Email</Button>}
    </div>
  );
}
