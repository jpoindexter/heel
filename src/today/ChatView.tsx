import { Button, Callout } from "@radix-ui/themes";
import { client } from "../api/default-client";
import type { BrainSummary } from "../settings/brain-summary";
import { Notifier } from "../ui/Notifier";
import "./chat.css";
import { Compose } from "./Compose";
import { NowStrip } from "./NowStrip";
import { TaskDrawer } from "./TaskDrawer";
import { Thread } from "./Thread";
import { nowCard } from "./today-model";
import { useChatActions } from "./useChatActions";
import { useTasks } from "./useTasks";
import { useThread } from "./useThread";

type Props = { active: boolean; summary: BrainSummary | null; onOpenSettings: () => void };

/** The panel's main view: Now strip, conversation, folded task drawer, then chips and the ask box pinned at the bottom. */
export function ChatView({ active, summary, onOpenSettings }: Props) {
  const tasks = useTasks(client, active);
  const thread = useThread(client, { onChanged: tasks.refresh, notify: (message) => tasks.showNotice(message, "error") });
  const { draft, setDraft, onSend, onChip } = useChatActions({ thread, tasks });
  const { state, notice } = tasks;

  const ready = state.phase === "ready" ? state : null;
  const now = ready ? nowCard(ready.tasks) : null;

  return (
    <div className="chat">
      {state.phase === "error" && (
        <Callout.Root color="amber" role="alert" size="1" highContrast>
          <Callout.Text>{state.message}</Callout.Text>
          <Button size="1" variant="soft" onClick={() => void tasks.refresh()}>Try again</Button>
        </Callout.Root>
      )}
      <NowStrip now={now} onComplete={() => now && void tasks.complete(now.task)} />
      <Thread
        messages={thread.messages}
        summary={summary}
        onRetry={thread.retry}
        onOpenSettings={onOpenSettings}
        onUndo={(id, index) => void thread.undoReceipt(id, index)}
      />
      {ready && <TaskDrawer tasks={ready.tasks} parked={ready.parked} onComplete={(t) => void tasks.complete(t)} onRemove={(t) => void tasks.remove(t)} onPromote={(i) => void tasks.promote(i)} />}

      <div className="compose-zone">
        <Notifier notice={notice} onDismiss={tasks.dismissNotice} />
        <Compose active={active} draft={draft} busy={thread.busy} onDraft={setDraft} onSend={onSend} onStop={thread.stop} onChip={(chip) => void onChip(chip)} />
      </div>
    </div>
  );
}
