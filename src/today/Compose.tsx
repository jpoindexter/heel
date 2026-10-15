import { useRef, type FormEvent, type KeyboardEvent } from "react";
import { CHIPS, type Chip } from "./today-model";

type Props = {
  draft: string;
  busy: boolean;
  onDraft: (value: string) => void;
  onSend: () => void;
  onChip: (chip: Chip) => void;
};

/** Three fixed chips (same place, same order, always) and the ask box with a real, visible label. */
export function Compose({ draft, busy, onDraft, onSend, onChip }: Props) {
  const box = useRef<HTMLTextAreaElement>(null);
  const empty = draft.trim().length === 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!empty && !busy) onSend();
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!empty && !busy) onSend();
    }
  };

  return (
    <div className="compose">
      <div className="chips" role="group" aria-label="Quick actions">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="button chip"
            disabled={busy && chip.prompt !== null}
            onClick={() => {
              onChip(chip);
              if (chip.prompt === null) box.current?.focus();
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="ask">
        <label htmlFor="ask">Ask Heel</label>
        <textarea
          id="ask"
          ref={box}
          rows={2}
          maxLength={4000}
          value={draft}
          aria-describedby="ask-help"
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={onKey}
        />
        <div className="ask-row">
          <p id="ask-help" className="helper">Enter to send. Shift+Enter for a new line.</p>
          <button type="submit" className="button button-primary" aria-busy={busy} disabled={busy || empty}>
            {busy ? "Thinking…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
