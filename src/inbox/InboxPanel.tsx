import { Button, Card, Text } from "@radix-ui/themes";
import { Collapsible } from "radix-ui";
import type { Client } from "../api/client";
import "./inbox.css";
import { useDigest } from "./useInbox";

type Props = { client: Client; connected: boolean; onTaskAdded: () => void };

/** Under the focus area: "Check email" reads recent mail and offers up to three as tasks, each in one literal line. */
export function InboxPanel({ client, connected, onTaskAdded }: Props) {
  const { state, check, addTask, dismiss } = useDigest(client, onTaskAdded);
  if (!connected) return null;

  if (state.phase === "idle") {
    return <Button className="inbox-start" size="2" variant="soft" color="gray" onClick={() => void check()}>Check email</Button>;
  }
  if (state.phase === "loading") return <Text size="2" color="gray" role="status">Reading your inbox…</Text>;
  if (state.phase === "error") {
    return (
      <Card size="1" variant="surface" role="alert" className="inbox-card">
        <Text size="2">{state.message}</Text>
        <div className="inbox-actions">
          <Button size="1" variant="soft" onClick={() => void check()}>Try again</Button>
          <Button size="1" variant="soft" color="gray" onClick={dismiss}>Close</Button>
        </div>
      </Card>
    );
  }
  const { digest, added } = state;
  return (
    <Card size="1" variant="surface" role="region" aria-label="Email that needs you" className="inbox-card">
      {digest.items.length === 0 ? (
        <Text size="2">Nothing needs you right now ({digest.considered} recent {digest.considered === 1 ? "email" : "emails"} looked at).</Text>
      ) : (
        digest.items.map((item) => (
          <div key={item.messageId} className="inbox-item">
            <Text size="2">{item.summary}</Text>
            <Text size="1" color="gray" className="inbox-from">{item.from} · {item.subject}</Text>
            <Button size="1" variant="soft" disabled={added.includes(item.messageId)} onClick={() => void addTask(item.messageId, item.taskTitle)}>
              {added.includes(item.messageId) ? "Added" : `Add task: ${item.taskTitle}`}
            </Button>
          </div>
        ))
      )}
      {digest.sentToModel && (
        <Collapsible.Root>
          <Collapsible.Trigger asChild><Button size="1" variant="ghost" color="gray">What was sent to the AI</Button></Collapsible.Trigger>
          <Collapsible.Content><pre className="inbox-sent">{digest.sentToModel}</pre></Collapsible.Content>
        </Collapsible.Root>
      )}
      <div className="inbox-actions">
        <Button size="1" variant="soft" color="gray" onClick={() => void check()}>Check again</Button>
        <Button size="1" variant="soft" color="gray" onClick={dismiss}>Close</Button>
      </div>
    </Card>
  );
}
