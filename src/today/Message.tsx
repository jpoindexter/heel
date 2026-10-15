import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Button, Callout, Card, Text } from "@radix-ui/themes";
import { Receipts } from "./Receipts";
import type { Message as ThreadMessage } from "./thread-model";

type Props = {
  message: ThreadMessage;
  canRetry: boolean;
  onRetry: () => void;
  onOpenSettings: () => void;
  onUndo: (index: number) => void;
};

function Paragraphs({ text }: { text: string }) {
  return text.split("\n\n").map((paragraph, index) => (
    <Text as="p" size="2" key={`${index}-${paragraph.slice(0, 12)}`} className="msg-text">{paragraph}</Text>
  ));
}

/** One turn in the thread. Sender is told apart by alignment, a surface and a hidden heading, never colour alone. */
export function Message({ message, canRetry, onRetry, onOpenSettings, onUndo }: Props) {
  if (message.role === "user") {
    return (
      <Card size="1" variant="surface" asChild className="msg msg-user">
        <article>
          <h3 className="visually-hidden">You</h3>
          <Paragraphs text={message.label ?? message.text} />
        </article>
      </Card>
    );
  }
  return (
    <article className="msg msg-heel" aria-busy={message.status === "pending"}>
      <h3 className="visually-hidden">Heel</h3>
      {message.status === "pending" && <Text as="p" size="2" color="gray">Thinking…</Text>}
      {message.status === "said" && (
        <>
          <Paragraphs text={message.say} />
          <Receipts receipts={message.receipts} onUndo={onUndo} />
        </>
      )}
      {message.status === "failed" && (
        <div className="failed">
          <Callout.Root color="amber" size="1" role="alert">
            <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
            <Callout.Text>{message.message}</Callout.Text>
          </Callout.Root>
          <div className="row">
            {canRetry && <Button size="2" variant="soft" onClick={onRetry}>Try again</Button>}
            {message.offerSettings && <Button size="2" variant="soft" color="gray" onClick={onOpenSettings}>Open Settings</Button>}
          </div>
        </div>
      )}
    </article>
  );
}
