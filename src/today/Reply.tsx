import { useEffect, useRef, useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { IconButton, Text } from "@radix-ui/themes";
import { endLeave, LEAVE_MS, type Leave } from "./bar-model";
import { Message } from "./Message";
import { latestExchange, type Message as ThreadMessage } from "./thread-model";

type Props = {
  messages: readonly ThreadMessage[];
  onRetry: (id: number) => void;
  onOpenSettings: () => void;
  onUndo: (id: number, index: number) => void;
  onOpenDocument?: (documentId: string, file: "md" | "pdf") => void;
  onOpenMail?: (messageId: string) => void;
  onConfirm?: (id: number, index: number) => void;
  /** Clear the conversation (with Undo): after the fade, or at once when the layer goes away under it. */
  onDismiss: () => void;
  /** Pop the layer once the fade ends. Not called when something else (Esc) already closed it. */
  onClosed: () => void;
};

/** Closing fades the reply out first, then clears it. Esc during the fade unmounts the layer: the clear still runs, from the cleanup, or the conversation is back on the next open. */
function useLeave(onDismiss: () => void, onClosed: () => void) {
  const [leaving, setLeaving] = useState(false);
  const leave = useRef<Leave>({});
  const timer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      endLeave(leave.current);
    },
    [],
  );
  const dismiss = () => {
    setLeaving(true);
    leave.current.clear = onDismiss;
    timer.current = window.setTimeout(() => {
      setLeaving(false);
      endLeave(leave.current);
      onClosed();
    }, LEAVE_MS);
  };
  return { leaving, dismiss };
}

/** The latest exchange, above the tasks: what was asked as a small bubble on the right, Heel's answer on the left, one cross to put it away. */
export function Reply({ messages, onRetry, onOpenSettings, onUndo, onOpenDocument, onOpenMail, onConfirm, onDismiss, onClosed }: Props) {
  const exchange = latestExchange(messages);
  const { leaving, dismiss } = useLeave(onDismiss, onClosed);
  if (!exchange) return null;
  const { asked, heel } = exchange;
  return (
    <section role="log" aria-live="polite" aria-label="Reply" className="reply" data-leaving={leaving || undefined}>
      {asked && (
        <div className="bubble-row asked">
          <Text size="2" className="bubble bubble-asked">{asked}</Text>
        </div>
      )}
      <div className="bubble-row">
        <div className="bubble bubble-heel">
          <Message message={heel} onRetry={() => onRetry(heel.id)} onOpenSettings={onOpenSettings} onUndo={(index) => onUndo(heel.id, index)} onOpenDocument={onOpenDocument} onOpenMail={onOpenMail} onConfirm={onConfirm && ((index) => onConfirm(heel.id, index))} />
        </div>
        {heel.status !== "pending" && (
          <IconButton size="1" variant="ghost" color="gray" aria-label="Close reply" onClick={dismiss}>
            <Cross2Icon aria-hidden="true" />
          </IconButton>
        )}
      </div>
    </section>
  );
}
