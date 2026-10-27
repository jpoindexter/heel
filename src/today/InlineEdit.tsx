import { useRef, useState, type KeyboardEvent } from "react";
import { TextField } from "@radix-ui/themes";

type Props = { label: string; initial: string; onSave: (text: string) => void; onCancel: () => void };

/** What Enter or leaving the field means: the new words, or undefined to keep the old ones (nothing typed, or nothing changed). */
export function editToCommit(draft: string, initial: string): string | undefined {
  const next = draft.trim();
  return next && next !== initial.trim() ? next : undefined;
}

/** A row's words, editable in place: Enter or leaving the field saves a change, Escape cancels, an empty field saves nothing. */
export function InlineEdit({ label, initial, onSave, onCancel }: Props) {
  const [text, setText] = useState(initial);
  const done = useRef(false);
  // The field unmounts on save or cancel, and WebKit blurs it on the way out: that blur must not save or cancel again.
  const finish = (commit: string | undefined) => {
    if (done.current) return;
    done.current = true;
    if (commit === undefined) onCancel();
    else onSave(commit);
  };
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") return finish(undefined);
    if (event.key !== "Enter") return;
    event.preventDefault();
    finish(editToCommit(text, initial));
  };
  return <TextField.Root size="1" autoFocus aria-label={label} value={text} maxLength={500} onChange={(event) => setText(event.target.value)} onKeyDown={onKey} onBlur={() => finish(editToCommit(text, initial))} />;
}
