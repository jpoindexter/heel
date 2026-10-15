import { useRef, type FormEvent, type KeyboardEvent } from "react";
import { Button, TextArea } from "@radix-ui/themes";
import { VisuallyHidden } from "radix-ui";
import { QuickChips } from "./QuickChips";
import type { Chip } from "./today-model";
import { useAskFocus } from "./useAskFocus";

type Props = {
  /** This view is the one showing. */
  active: boolean;
  draft: string;
  busy: boolean;
  onDraft: (value: string) => void;
  onSend: () => void;
  /** Stop the answer in flight. */
  onStop: () => void;
  onChip: (chip: Chip) => void;
};

/** Same slot, same size: Send becomes Stop while Heel is thinking, so there is one place to look. */
function SendOrStop({ busy, empty, onStop }: { busy: boolean; empty: boolean; onStop: () => void }) {
  return busy ? (
    <Button type="button" size="3" variant="soft" color="gray" highContrast onClick={onStop}>Stop</Button>
  ) : (
    <Button type="submit" size="3" highContrast disabled={empty}>Send</Button>
  );
}

/** Three fixed chips (same place, same order, always) and the ask box (real label, hidden visually; the placeholder is only a hint). */
export function Compose({ active, draft, busy, onDraft, onSend, onStop, onChip }: Props) {
  const box = useRef<HTMLTextAreaElement>(null);
  const empty = draft.trim().length === 0;

  useAskFocus(box, active);

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
      <QuickChips
        busy={busy}
        onChip={(chip) => {
          onChip(chip);
          if (chip.prompt === null) box.current?.focus();
        }}
      />
      <form onSubmit={submit} className="ask">
        <VisuallyHidden.Root asChild><label htmlFor="ask">Ask Heel</label></VisuallyHidden.Root>
        <TextArea
          id="ask"
          ref={box}
          size="2"
          rows={2}
          maxLength={4000}
          resize="none"
          placeholder="What's on your mind?"
          value={draft}
          aria-describedby="ask-help"
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={onKey}
        />
        <VisuallyHidden.Root asChild><p id="ask-help">Enter to send. Shift+Enter for a new line.</p></VisuallyHidden.Root>
        <SendOrStop busy={busy} empty={empty} onStop={onStop} />
      </form>
    </div>
  );
}
