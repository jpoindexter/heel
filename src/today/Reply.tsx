import { useEffect, useRef, useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { IconButton, Text } from "@radix-ui/themes";
import { LEAVE_MS } from "./bar-model";
import { Message } from "./Message";
import { latestExchange, type Message as ThreadMessage } from "./thread-model";

type Props = {
  messages: readonly ThreadMessage[];
  onRetry: (id: number) => void;
  onOpenSettings: () => void;
  onUndo: (id: number, index: number) => void;
  onOpenDocument?: (documentId: string, file: "md" | "pdf") => void;
  /** Close the reply (clears the conversation, with Undo). */
  onDismiss: () => void;
};

/** Closing fades the reply out first, then clears it. */
function useLeave(onDismiss: () => void) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const dismiss = () => {
    setLeaving(true);
    timer.current = window.setTimeout(() => {
      setLeaving(false);
      onDismiss();
    }, LEAVE_MS);
  };
  return { leaving, dismiss };
}

/** The latest exchange, above the tasks: what was asked as a small bubble on the right, Heel's answer on the left, one cross to put it away. */
export function Reply({ messages, onRetry, onOpenSettings, onUndo, onOpenDocument, onDismiss }: Props) {
  const exchange = latestExchange(messages);
  const { leaving, dismiss } = useLeave(onDismiss);
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
          <Message message={heel} onRetry={() => onRetry(heel.id)} onOpenSettings={onOpenSettings} onUndo={(index) => onUndo(heel.id, index)} onOpenDocument={onOpenDocument} />
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
