import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Button, Callout, Text } from "@radix-ui/themes";
import { Receipts } from "./Receipts";
import type { HeelMessage } from "./thread-model";

type Props = {
  message: HeelMessage;
  onRetry: () => void;
  onOpenSettings: () => void;
  onUndo: (index: number) => void;
  onOpenDocument?: (documentId: string, file: "md" | "pdf") => void;
};

function Paragraphs({ text }: { text: string }) {
  return text.split("\n\n").map((paragraph, index) => (
    <Text as="p" size="2" key={`${index}-${paragraph.slice(0, 12)}`} className="msg-text in">{paragraph}</Text>
  ));
}

/** Heel's answer: thinking, said (with what it did, and Undo), or failed (with the way to try again). */
export function Message({ message, onRetry, onOpenSettings, onUndo, onOpenDocument }: Props) {
  return (
    <article className="msg" aria-busy={message.status === "pending"}>
      <h3 className="visually-hidden">Heel</h3>
      {message.status === "pending" && <Text as="p" size="2" color="gray" className="pulse">Thinking…</Text>}
      {message.status === "said" && (
        <>
          <Paragraphs text={message.say} />
          <Receipts receipts={message.receipts} onUndo={onUndo} onOpen={onOpenDocument} />
        </>
      )}
      {message.status === "failed" && (
        <div className="failed">
          <Callout.Root color="amber" size="1" role="alert" highContrast>
            <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
            <Callout.Text>{message.message}</Callout.Text>
          </Callout.Root>
          <div className="row">
            <Button size="1" variant="soft" radius="full" onClick={onRetry}>Try again</Button>
            {message.offerSettings && <Button size="1" variant="soft" radius="full" color="gray" onClick={onOpenSettings}>Open Settings</Button>}
          </div>
        </div>
      )}
    </article>
  );
}
