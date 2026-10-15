import { Button } from "@radix-ui/themes";
import type { BrainSummary } from "../settings/brain-summary";
import { Compose } from "./Compose";
import { Thread } from "./Thread";
import type { useTodayState } from "./useTodayState";

type Props = { state: ReturnType<typeof useTodayState>; active: boolean; summary: BrainSummary | null; onOpenSettings: () => void };

/** The agent app: the conversation and one box to talk in. The three quick starters show only while the conversation is empty. */
export function AgentView({ state, active, summary, onOpenSettings }: Props) {
  const { thread, chat } = state;
  return (
    <>
      <Thread
        messages={thread.messages}
        summary={summary}
        onRetry={thread.retry}
        onOpenSettings={onOpenSettings}
        onUndo={(id, index) => void thread.undoReceipt(id, index)}
        onClear={() => void thread.clear()}
      />
      <Compose
        active={active}
        draft={chat.draft}
        busy={thread.busy}
        showChips={thread.messages.length === 0}
        onDraft={chat.setDraft}
        onSend={chat.onSend}
        onStop={thread.stop}
        onChip={(chip) => void chat.onChip(chip)}
      />
      <Button size="1" variant="ghost" color="gray" className="agent-which" onClick={onOpenSettings}>{summary?.label ?? "Choose an AI"}</Button>
    </>
  );
}
