import { Text, TextField } from "@radix-ui/themes";
import { numberToCommit } from "./settings-model";

type Props = { id: string; label: string; value: number; /** Store it; resolves true once the helper kept it. */ onCommit: (value: number) => Promise<boolean> };

/**
 * One number, saved on blur. The field always ends up showing the stored value: an empty or nonsense entry snaps back,
 * a refused one snaps back once the helper has said no, and an Undo (a new `value`) remounts it.
 */
export function NumberField({ id, label, value, onCommit }: Props) {
  return (
    <div className="field">
      <Text as="label" size="1" color="gray" htmlFor={id}>{label}</Text>
      <TextField.Root
        key={value}
        id={id}
        size="1"
        type="number"
        inputMode="numeric"
        defaultValue={value}
        onBlur={(event) => {
          const field = event.target;
          const next = numberToCommit(field.value, value);
          if (next === null) return void (field.value = String(value));
          void onCommit(next).then((kept) => kept || (field.value = String(value)));
        }}
      />
    </div>
  );
}
