import { useEffect, useRef, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { ArrowUpIcon, StopIcon } from "@radix-ui/react-icons";
import { IconButton, TextArea } from "@radix-ui/themes";
import { VisuallyHidden } from "radix-ui";
import { modeInfo, type ComposeMode } from "./compose-model";
import { ModeMenu } from "./ModeMenu";
import { useAskFocus } from "./useAskFocus";
import { useAutoGrow } from "./useAutoGrow";

type Props = {
  /** The Today screen is the one showing. */
  active: boolean;
  /** Changes when something (Cmd+N) wants the box focused. */
  focusSignal: number;
  mode: ComposeMode;
  draft: string;
  /** Heel is thinking. */
  busy: boolean;
  onMode: (mode: ComposeMode) => void;
  onDraft: (value: string) => void;
  onSubmit: () => void;
  /** Stop the answer in flight. */
  onStop: () => void;
};

function SendOrStop({ stoppable, empty, label, onStop }: { stoppable: boolean; empty: boolean; label: string; onStop: () => void }) {
  return stoppable ? (
    <IconButton type="button" size="2" radius="full" variant="soft" color="gray" highContrast aria-label="Stop" onClick={onStop}>
      <StopIcon aria-hidden="true" />
    </IconButton>
  ) : (
    <IconButton type="submit" size="2" radius="full" className="send-fab" disabled={empty} aria-label={label}>
      <ArrowUpIcon aria-hidden="true" />
    </IconButton>
  );
}

function useFocusOnSignal(box: RefObject<HTMLTextAreaElement | null>, signal: number, active: boolean): void {
  useEffect(() => {
    if (signal > 0 && active) box.current?.focus();
  }, [box, signal, active]);
}

/** The one input. A real label (hidden); the placeholder only repeats what the mode button says. Send becomes Stop while Heel thinks an answer. */
export function Compose({ active, focusSignal, mode, draft, busy, onMode, onDraft, onSubmit, onStop }: Props) {
  const box = useRef<HTMLTextAreaElement>(null);
  const info = modeInfo(mode);
  const empty = draft.trim().length === 0;
  const stoppable = busy && mode === "ask";

  useAskFocus(box, active);
  useAutoGrow(box, draft);
  useFocusOnSignal(box, focusSignal, active);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!empty) onSubmit();
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!empty) onSubmit();
    }
  };

  return (
    <form onSubmit={submit} className="compose">
      <ModeMenu mode={mode} onMode={onMode} />
      <VisuallyHidden.Root asChild><label htmlFor="compose">{info.menu}</label></VisuallyHidden.Root>
      <TextArea
        id="compose"
        ref={box}
        size="2"
        rows={1}
        maxLength={info.maxLength}
        resize="none"
        placeholder={info.placeholder}
        value={draft}
        aria-describedby="compose-help"
        onChange={(event) => onDraft(event.target.value)}
        onKeyDown={onKey}
      />
      <VisuallyHidden.Root asChild><p id="compose-help">Enter to go. Shift+Enter for a new line. Command N brings you here.</p></VisuallyHidden.Root>
      <SendOrStop stoppable={stoppable} empty={empty} label={info.menu} onStop={onStop} />
    </form>
  );
}
