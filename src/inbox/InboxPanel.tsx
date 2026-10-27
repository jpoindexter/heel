import { Button, Card, Text } from "@radix-ui/themes";
import type { DigestItemDto } from "../../shared/api";
import "./inbox.css";
import { ReplyFlow } from "./ReplyFlow";
import type { useDigest } from "./useInbox";
import type { useReplyFlow } from "./useMail";

/** Shown from Connect Gmail until Google sends the person back: the browser has them, Heel is looking every two seconds. */
export function ConnectStatus({ waiting }: { waiting: boolean }) {
  if (!waiting) return null;
  return <Text size="2" color="gray" role="status" className="pulse">Waiting for Google…</Text>;
}

type Props = {
  digest: ReturnType<typeof useDigest>;
  reply: ReturnType<typeof useReplyFlow>;
  onOpen: (messageId: string) => void;
};

function Item({ item, added, onAdd, onOpen, onReply }: { item: DigestItemDto; added: boolean; onAdd: () => void; onOpen: () => void; onReply: () => void }) {
  return (
    <div className="inbox-item">
      <Text size="2">{item.summary}</Text>
      <Text size="1" color="gray" className="inbox-from clamp-1">{item.from} · {item.subject}</Text>
      <div className="inbox-actions">
        <Button size="1" radius="full" variant="soft" disabled={added} onClick={onAdd}>{added ? "Added" : "Add task"}</Button>
        <Button size="1" radius="full" variant="soft" color="gray" aria-label={`Open in Mail: ${item.subject}`} onClick={onOpen}>Open</Button>
        <Button size="1" radius="full" variant="soft" color="gray" aria-label={`Reply: ${item.subject}`} onClick={onReply}>Reply</Button>
      </div>
    </div>
  );
}

/** What "Email" found in Apple Mail: up to three items, each in one literal line, with Add task / Open / Reply. Nothing shows until it is asked for. */
export function InboxPanel({ digest: controller, reply, onOpen }: Props) {
  const { state, check, addTask, dismiss } = controller;
  if (state.phase === "idle") return null;
  if (state.phase === "loading") return <Text size="2" color="gray" role="status" className="pulse">Reading your inbox…</Text>;
  if (state.phase === "error") {
    return (
      <Card size="1" variant="surface" role="alert" className="inbox-card pop">
        <Text size="2">{state.message}</Text>
        <div className="inbox-actions">
          <Button size="1" radius="full" variant="soft" onClick={() => void check()}>Try again</Button>
          <Button size="1" radius="full" variant="soft" color="gray" onClick={dismiss}>Close</Button>
        </div>
      </Card>
    );
  }
  const { digest, added } = state;
  const replying = reply.state.phase === "idle" ? null : reply.state.item.messageId;
  return (
    <Card size="1" variant="surface" role="region" aria-label="Email that needs you" className="inbox-card pop">
      {digest.items.length === 0 ? (
        <Text size="2">Nothing needs you right now ({digest.considered} recent unread {digest.considered === 1 ? "email" : "emails"} looked at).</Text>
      ) : (
        digest.items.map((item) => (
          <div key={item.messageId} className="inbox-thread">
            <Item item={item} added={added.includes(item.messageId)} onAdd={() => void addTask(item.messageId, item.taskTitle)} onOpen={() => onOpen(item.messageId)} onReply={() => reply.start(item)} />
            {replying === item.messageId && <ReplyFlow flow={reply} />}
          </div>
        ))
      )}
      {state.error && <Text size="2" color="amber" role="alert">{state.error}</Text>}
      <Text size="1" color="gray">Read from Apple Mail on this Mac. Sent to the AI: sender, subject and the first lines of each unread email.</Text>
      <div className="inbox-actions">
        <Button size="1" radius="full" variant="soft" color="gray" onClick={() => void check()}>Check again</Button>
        <Button size="1" radius="full" variant="soft" color="gray" onClick={dismiss}>Close</Button>
      </div>
    </Card>
  );
}
