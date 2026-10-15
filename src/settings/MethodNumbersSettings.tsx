import { useId } from "react";
import { Text, TextField } from "@radix-ui/themes";
import { SIZES, SIZE_LABELS, type Method, type MethodNumbers } from "../../shared/method";
import { useMethod } from "../ui/method";
import { useNotices } from "../ui/notices";

const MIN_PER_HOUR = 60;

type FieldProps = { id: string; label: string; value: number; onCommit: (value: number) => void };

function NumberField({ id, label, value, onCommit }: FieldProps) {
  return (
    <div className="field">
      <Text as="label" size="1" color="gray" htmlFor={id}>{label}</Text>
      <TextField.Root id={id} size="1" type="number" inputMode="numeric" defaultValue={value} onBlur={(e) => Number(e.target.value) !== value && onCommit(Number(e.target.value))} />
    </div>
  );
}

/** The jar's size and the minutes behind each T-shirt size, only for the methods that are on. Saved on blur, with Undo. */
export function MethodNumbersSettings({ method }: { method: Method }) {
  const { numbers, changeNumbers } = useMethod();
  const notices = useNotices();
  const id = useId();
  const save = (next: MethodNumbers, previous: MethodNumbers) => {
    void changeNumbers(next).then((refused) => {
      if (refused) return notices.show({ message: refused, tone: "error" });
      notices.show({ message: "Numbers changed", tone: "info", undo: () => void changeNumbers(previous) });
    });
  };
  if (method.structure !== "pickle-jar" && method.sizing !== "tshirt") return null;
  return (
    <div className="method-numbers">
      {method.structure === "pickle-jar" && (
        <>
          <NumberField id={`${id}-cap`} label="The day holds (hours)" value={numbers.jarCapacityMin / MIN_PER_HOUR} onCommit={(h) => save({ ...numbers, jarCapacityMin: Math.round(h * MIN_PER_HOUR) }, numbers)} />
          <NumberField id={`${id}-rocks`} label="Rocks at most" value={numbers.maxRocks} onCommit={(n) => save({ ...numbers, maxRocks: n }, numbers)} />
        </>
      )}
      {method.sizing === "tshirt" &&
        SIZES.map((size) => (
          <NumberField key={size} id={`${id}-${size}`} label={`${SIZE_LABELS[size]} (min)`} value={numbers.sizeMinutes[size]} onCommit={(n) => save({ ...numbers, sizeMinutes: { ...numbers.sizeMinutes, [size]: n } }, numbers)} />
        ))}
    </div>
  );
}
