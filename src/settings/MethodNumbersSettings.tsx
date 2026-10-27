import { useId } from "react";
import { Text, TextField } from "@radix-ui/themes";
import { BUCKET_LABELS, SIZES, SIZE_LABELS, SLOT_BUCKETS, type Method, type MethodNumbers } from "../../shared/method";
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

type SaveProps = { numbers: MethodNumbers; save: (next: MethodNumbers) => void; id: string };

/** The structure's own numbers: the jar's size, or 1-3-5's slots. Nothing for the structures that have none. */
function StructureNumbers({ method, numbers, save, id }: SaveProps & { method: Method }) {
  if (method.structure === "pickle-jar") {
    return (
      <>
        <NumberField id={`${id}-cap`} label="The day holds (hours)" value={numbers.jarCapacityMin / MIN_PER_HOUR} onCommit={(h) => save({ ...numbers, jarCapacityMin: Math.round(h * MIN_PER_HOUR) })} />
        <NumberField id={`${id}-rocks`} label="Rocks at most" value={numbers.maxRocks} onCommit={(n) => save({ ...numbers, maxRocks: n })} />
      </>
    );
  }
  if (method.structure === "one-three-five") {
    return SLOT_BUCKETS.map((bucket) => (
      <NumberField key={bucket} id={`${id}-${bucket}`} label={`${BUCKET_LABELS[bucket]} tasks a day`} value={numbers.slots[bucket]} onCommit={(n) => save({ ...numbers, slots: { ...numbers.slots, [bucket]: n } })} />
    ));
  }
  if (method.structure === "two-minute") {
    return <NumberField id={`${id}-quick`} label="Do it now under (min)" value={numbers.quickMin} onCommit={(n) => save({ ...numbers, quickMin: n })} />;
  }
  if (method.structure === "ivy-lee") {
    return <NumberField id={`${id}-six`} label="Tasks for tomorrow" value={numbers.ivyLeeCount} onCommit={(n) => save({ ...numbers, ivyLeeCount: n })} />;
  }
  return null;
}

const STRUCTURES_WITH_NUMBERS: readonly Method["structure"][] = ["pickle-jar", "one-three-five", "two-minute", "ivy-lee"];

/** The structure's numbers and the minutes behind each T-shirt size, only for the methods that are on. Saved on blur, with Undo. */
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
  if (!STRUCTURES_WITH_NUMBERS.includes(method.structure) && method.sizing !== "tshirt") return null;
  return (
    <div className="method-numbers">
      <StructureNumbers method={method} numbers={numbers} save={(next) => save(next, numbers)} id={id} />
      {method.sizing === "tshirt" &&
        SIZES.map((size) => (
          <NumberField key={size} id={`${id}-${size}`} label={`${SIZE_LABELS[size]} (min)`} value={numbers.sizeMinutes[size]} onCommit={(n) => save({ ...numbers, sizeMinutes: { ...numbers.sizeMinutes, [size]: n } }, numbers)} />
        ))}
    </div>
  );
}
