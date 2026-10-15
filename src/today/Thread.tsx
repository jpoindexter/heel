import { Button } from "@radix-ui/themes";
import type { BrainSummary } from "../settings/brain-summary";
import { FirstRun } from "./FirstRun";
import { Message } from "./Message";
import type { Message as ThreadMessage } from "./thread-model";
import { useThreadScroll } from "./useThreadScroll";

type Props = {
  messages: readonly ThreadMessage[];
  summary: BrainSummary | null;
  onRetry: (id: number) => void;
  onOpenSettings: () => void;
  onUndo: (id: number, index: number) => void;
};

/** The conversation column (scroll rules live in useThreadScroll). */
export function Thread({ messages, summary, onRetry, onOpenSettings, onUndo }: Props) {
  const { scroller, showJump, onScroll, jumpToLatest } = useThreadScroll(messages);

  const lastId = messages.at(-1)?.id;

  return (
    <div className="thread-wrap">
      <div ref={scroller} role="log" aria-label="Conversation" tabIndex={0} className="thread" onScroll={onScroll}>
        {messages.length === 0 && summary?.kind === "setup" && <FirstRun summary={summary} onOpenSettings={onOpenSettings} />}
        {messages.length === 0 && summary?.kind === "ready" && (
          <p className="helper thread-empty">Tell me what's on your mind and I'll turn it into one small first step.</p>
        )}
        {messages.map((message) => (
          <div key={message.id} data-msg={message.id}>
            <Message
              message={message}
              canRetry={message.id === lastId}
              onRetry={() => onRetry(message.id)}
              onOpenSettings={onOpenSettings}
              onUndo={(index) => onUndo(message.id, index)}
            />
          </div>
        ))}
      </div>
      {showJump && <Button size="2" variant="solid" color="gray" highContrast className="jump" onClick={jumpToLatest}>Jump to latest</Button>}
    </div>
  );
}
