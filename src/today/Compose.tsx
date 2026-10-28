import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUpIcon, PlusIcon, StopIcon } from "@radix-ui/react-icons";
import { IconButton, Text, TextArea } from "@radix-ui/themes";
import { VisuallyHidden } from "radix-ui";
import { ActionTray } from "./ActionTray";
import { CARD_TRAY, barHint, barKey, type TrayAction } from "./bar-model";
import { MAX_ASK_LENGTH } from "./quick-add";
import { useAskFocus } from "./useAskFocus";
import { useAutoGrow } from "./useAutoGrow";
import "./bar.css";

type Props = {
  /** The Today screen is the one showing. */
  active: boolean;
  /** Changes when something (Cmd+N) wants the box focused again. */
  focusSignal: number;
  draft: string;
  thinking: boolean;
  /** A Low or Off day: no + in the card either. */
  chips: boolean;
  trayOpen: boolean;
  trayClosing: boolean;
  emailReady: boolean;
  onDraft: (value: string) => void;
  onSend: () => void;
  onAdd: () => void;
  onClose: () => void;
  onStop: () => void;
  onToggleTray: () => void;
  onAction: (action: TrayAction) => void;
  onFocus: () => void;
  onBlur: () => void;
};

function SendOrStop({ thinking, empty, onStop }: { thinking: boolean; empty: boolean; onStop: () => void }) {
  return thinking ? (
    <IconButton type="button" size="2" radius="full" variant="soft" color="gray" highContrast aria-label="Stop" onClick={onStop}>
      <StopIcon aria-hidden="true" />
    </IconButton>
  ) : (
    <IconButton type="submit" size="2" radius="full" className="send-fab" disabled={empty} aria-label="Send to Heel">
      <ArrowUpIcon aria-hidden="true" />
    </IconButton>
  );
}

type RowProps = Pick<Props, "thinking" | "chips" | "trayOpen" | "trayClosing" | "emailReady" | "onStop" | "onToggleTray" | "onAction"> & { empty: boolean };

/** Under the text: +, then the key hint (or the four buttons in its place), then Send (Stop while Heel thinks). */
function ComposeRow({ thinking, chips, trayOpen, trayClosing, emailReady, onStop, onToggleTray, onAction, empty }: RowProps) {
  return (
    <div className="compose-row">
      {chips && (
        <IconButton type="button" size="2" radius="full" variant="surface" color="gray" className="plus" aria-label="More" aria-expanded={trayOpen} onClick={onToggleTray}>
          <PlusIcon aria-hidden="true" />
        </IconButton>
      )}
      {chips && trayOpen ? (
        <ActionTray actions={CARD_TRAY} closing={trayClosing} emailReady={emailReady} onAction={onAction} />
      ) : (
        <Text size="1" color="gray" className="grow hint">{barHint(empty, thinking)}</Text>
      )}
      <SendOrStop thinking={thinking} empty={empty} onStop={onStop} />
    </div>
  );
}

/** The open chat card: the text, then one row with +, the key hint (or the four buttons) and Send. Enter talks to Heel. */
export function Compose(p: Props) {
  const box = useRef<HTMLTextAreaElement>(null);
  const empty = p.draft.trim().length === 0;

  useAskFocus(box, p.active);
  useAutoGrow(box, p.draft);
  useEffect(() => {
    box.current?.focus();
  }, [p.focusSignal]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!empty && !p.thinking) p.onSend();
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const key = barKey({ ...event, isComposing: event.nativeEvent.isComposing });
    if (!key) return;
    event.preventDefault();
    if (key === "close") p.onClose();
    else if (key === "add") p.onAdd();
    else if (!empty && !p.thinking) p.onSend();
  };

  return (
    <form onSubmit={submit} className="compose pop">
      <VisuallyHidden.Root asChild><label htmlFor="compose">Tell Heel what's on your mind</label></VisuallyHidden.Root>
      <TextArea
        id="compose"
        ref={box}
        size="2"
        rows={1}
        maxLength={MAX_ASK_LENGTH}
        resize="none"
        placeholder="What's on your mind?"
        value={p.draft}
        aria-describedby="compose-help"
        onChange={(event) => p.onDraft(event.target.value)}
        onKeyDown={onKey}
        onFocus={p.onFocus}
        onBlur={p.onBlur}
      />
      <VisuallyHidden.Root asChild>
        <p id="compose-help">Enter asks Heel. Command Enter adds it as a task. Escape closes. Command N brings you here.</p>
      </VisuallyHidden.Root>
      <ComposeRow {...p} empty={empty} />
    </form>
  );
}
