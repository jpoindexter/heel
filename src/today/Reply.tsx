import { Cross2Icon } from "@radix-ui/react-icons";
import { IconButton, Text } from "@radix-ui/themes";
import { Message } from "./Message";
import { latestExchange, type Message as ThreadMessage } from "./thread-model";

type Props = {
  messages: readonly ThreadMessage[];
  onRetry: (id: number) => void;
  onOpenSettings: () => void;
  onUndo: (id: number, index: number) => void;
  /** Close the reply (clears the conversation, with Undo). */
  onDismiss: () => void;
};

/** The latest answer, above the tasks (so it is seen without scrolling and the tasks stay put): what was asked in one gray line, Heel's reply, and one cross to put it away. */
export function Reply({ messages, onRetry, onOpenSettings, onUndo, onDismiss }: Props) {
  const exchange = latestExchange(messages);
  if (!exchange) return null;
  const { asked, heel } = exchange;
  return (
    <section role="log" aria-live="polite" aria-label="Reply" className="reply">
      <div className="reply-head">
        {asked && <Text size="1" color="gray" className="reply-asked grow">{asked}</Text>}
        {heel.status !== "pending" && (
          <IconButton size="1" variant="ghost" color="gray" aria-label="Close reply" onClick={onDismiss}>
            <Cross2Icon aria-hidden="true" />
          </IconButton>
        )}
      </div>
      <Message message={heel} onRetry={() => onRetry(heel.id)} onOpenSettings={onOpenSettings} onUndo={(index) => onUndo(heel.id, index)} />
    </section>
  );
}
