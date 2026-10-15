import { useId, useState, type FormEvent } from "react";
import { Button, SegmentedControl, Text, TextField } from "@radix-ui/themes";
import { DEFAULT_TIME_BOX_MIN, TIME_BOX_PRESETS_MIN, rangeFor } from "../../shared/focus";

type Props = {
  /** What the box will be about, to start from. Editable: the check-in quotes whatever is here. */
  initialGoal: string;
  /** From the task's size (N20), when it has one. */
  initialMinutes?: number | null;
  onStart: (goal: string, realisticMin: number) => void;
  onCancel: () => void;
};

/** One field and one tap: what is the one thing, and about how long. The range is made for them, and shown. */
export function FocusForm({ initialGoal, initialMinutes, onStart, onCancel }: Props) {
  const goalId = useId();
  const [goal, setGoal] = useState(initialGoal);
  const [minutes, setMinutes] = useState(initialMinutes ?? DEFAULT_TIME_BOX_MIN);
  const range = rangeFor(minutes);
  const presets = TIME_BOX_PRESETS_MIN.includes(minutes as (typeof TIME_BOX_PRESETS_MIN)[number]) ? TIME_BOX_PRESETS_MIN : [...TIME_BOX_PRESETS_MIN, minutes].sort((a, b) => a - b);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (goal.trim()) onStart(goal, minutes);
  };

  return (
    <form className="focus-form" onSubmit={submit} aria-label="Start a time-box">
      <Text as="label" size="2" weight="medium" htmlFor={goalId}>The one thing for this box</Text>
      <TextField.Root id={goalId} size="2" maxLength={500} value={goal} autoFocus onChange={(event) => setGoal(event.target.value)} />
      <SegmentedControl.Root size="2" value={String(minutes)} onValueChange={(value) => setMinutes(Number(value))} aria-label="About how long">
        {presets.map((preset) => (
          <SegmentedControl.Item key={preset} value={String(preset)}>{preset} min</SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
      <Text size="1" color="gray">
        Most people need longer than they guess: plan for {minutes}, could be {range.bestMin}–{range.worstMin}.
      </Text>
      <div className="focus-actions">
        <Button type="submit" size="2" highContrast disabled={!goal.trim()}>Start</Button>
        <Button type="button" size="2" variant="soft" color="gray" onClick={onCancel}>Not now</Button>
      </div>
    </form>
  );
}
