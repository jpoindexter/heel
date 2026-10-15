import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { shouldFocusAskBox } from "./focus-rules";
import { CHIPS, type Chip } from "./today-model";

type Props = {
  /** This view is the one showing. */
  active: boolean;
  draft: string;
  busy: boolean;
  onDraft: (value: string) => void;
  onSend: () => void;
  onChip: (chip: Chip) => void;
};

/** Three fixed chips (same place, same order, always) and the ask box (real label, hidden visually; the placeholder is only a hint). */
export function Compose({ active, draft, busy, onDraft, onSend, onChip }: Props) {
  const box = useRef<HTMLTextAreaElement>(null);
  const empty = draft.trim().length === 0;

  // Ready to type: when this view shows, and whenever the window regains focus (hotkey, click on Greg).
  useEffect(() => {
    const focusBox = () => {
      if (shouldFocusAskBox(active, document.activeElement?.tagName ?? null)) box.current?.focus();
    };
    focusBox();
    window.addEventListener("focus", focusBox);
    return () => window.removeEventListener("focus", focusBox);
  }, [active]);

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
        <label htmlFor="ask" className="visually-hidden">Ask Heel</label>
        <textarea
          id="ask"
          ref={box}
          rows={2}
          maxLength={4000}
          placeholder="What's on your mind?"
          value={draft}
          aria-describedby="ask-help"
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={onKey}
        />
        <p id="ask-help" className="visually-hidden">Enter to send. Shift+Enter for a new line.</p>
        <button type="submit" className="button button-primary" aria-busy={busy} disabled={busy || empty}>Send</button>
      </form>
    </div>
  );
}
