import { useState, type KeyboardEvent } from "react";
import { TextField } from "@radix-ui/themes";

type Props = { label: string; initial: string; onSave: (text: string) => void; onCancel: () => void };

/** A row's words, editable in place: Enter saves, Escape (or leaving the field) cancels, an empty field saves nothing. */
export function InlineEdit({ label, initial, onSave, onCancel }: Props) {
  const [text, setText] = useState(initial);
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") return onCancel();
    if (event.key !== "Enter") return;
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || trimmed === initial.trim()) return onCancel();
    onSave(trimmed);
  };
  return <TextField.Root size="1" autoFocus aria-label={label} value={text} maxLength={500} onChange={(event) => setText(event.target.value)} onKeyDown={onKey} onBlur={onCancel} />;
}
