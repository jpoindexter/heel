import type { Message as ThreadMessage } from "./thread-model";
import { Receipts } from "./Receipts";

type Props = {
  message: ThreadMessage;
  canRetry: boolean;
  onRetry: () => void;
  onOpenSettings: () => void;
  onUndo: (index: number) => void;
};

function Paragraphs({ text }: { text: string }) {
  return text.split("\n\n").map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>);
}

/** One turn in the thread. Sender is told apart by alignment, background and a hidden label, never colour alone. */
export function Message({ message, canRetry, onRetry, onOpenSettings, onUndo }: Props) {
  if (message.role === "user") {
    return (
      <article className="msg msg-user">
        <h3 className="visually-hidden">You</h3>
        <Paragraphs text={message.label ?? message.text} />
      </article>
    );
  }
  return (
    <article className="msg msg-heel" aria-busy={message.status === "pending"}>
      <h3 className="visually-hidden">Heel</h3>
      {message.status === "pending" && <p className="helper">Thinking…</p>}
      {message.status === "said" && (
        <>
          <Paragraphs text={message.say} />
          <Receipts receipts={message.receipts} onUndo={onUndo} />
        </>
      )}
      {message.status === "failed" && (
        <div role="alert" className="callout">
          <p>{message.message}</p>
          <div className="actions">
            {canRetry && <button type="button" className="button" onClick={onRetry}>Try again</button>}
            {message.offerSettings && <button type="button" className="button" onClick={onOpenSettings}>Open Settings</button>}
          </div>
        </div>
      )}
    </article>
  );
}
