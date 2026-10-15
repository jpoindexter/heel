import { useState } from "react";
import { client } from "../api/default-client";
import type { BrainSummary } from "../settings/brain-summary";
import { Compose } from "./Compose";
import { NowStrip } from "./NowStrip";
import { TaskDrawer } from "./TaskDrawer";
import { Thread } from "./Thread";
import { PARK_HINT, nowCard, type Chip } from "./today-model";
import { useTasks } from "./useTasks";
import { useThread } from "./useThread";

type Props = { active: boolean; summary: BrainSummary | null; onOpenSettings: () => void };

/** The panel's main view: Now strip, conversation, folded task drawer, then chips and the ask box pinned at the bottom. */
export function ChatView({ active, summary, onOpenSettings }: Props) {
  const tasks = useTasks(client, active);
  const thread = useThread(client, { onChanged: tasks.refresh, notify: (message) => tasks.showNotice(message, "error") });
  const [draft, setDraft] = useState("");
  const { state, notice } = tasks;

  const send = (text: string) => {
    if (!text.trim() || thread.busy) return;
    void thread.send(text);
  };

  const onSend = () => {
    const text = draft;
    if (!text.trim() || thread.busy) return;
    setDraft("");
    send(text);
  };

  const onChip = async (chip: Chip) => {
    if (chip.prompt) return send(chip.prompt);
    if (!draft.trim()) return tasks.showNotice(PARK_HINT);
    if (await tasks.park(draft)) setDraft("");
  };

  const ready = state.phase === "ready" ? state : null;
  const now = ready ? nowCard(ready.tasks) : null;

  return (
    <div className="chat">
      {state.phase === "error" && (
        <div role="alert" className="callout">
          <p>{state.message}</p>
          <button type="button" className="button" onClick={() => void tasks.refresh()}>Try again</button>
        </div>
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
        {notice && (
          <div role="status" className="toast" data-tone={notice.tone}>
            <span>{notice.message}</span>
            {notice.undo && (
              <button type="button" className="button button-quiet" onClick={() => { notice.undo?.(); tasks.dismissNotice(); }}>Undo</button>
            )}
          </div>
        )}
        <Compose active={active} draft={draft} busy={thread.busy} onDraft={setDraft} onSend={onSend} onChip={(chip) => void onChip(chip)} />
      </div>
    </div>
  );
}
