import { useEffect, useRef, useState } from "react";
import { Button } from "@radix-ui/themes";
import type { BrainSummary } from "../settings/brain-summary";
import { replyAlignment } from "./focus-rules";
import { FirstRun } from "./FirstRun";
import { Message } from "./Message";
import { isNearBottom, type Message as ThreadMessage } from "./thread-model";

type Props = {
  messages: readonly ThreadMessage[];
  summary: BrainSummary | null;
  onRetry: (id: number) => void;
  onOpenSettings: () => void;
  onUndo: (id: number, index: number) => void;
};

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The conversation column. New messages follow only while the person is at the bottom; scrolled up, they get "Jump to latest"
 * instead of being yanked. A new answer starts at its first line if it is taller than the view.
 */
export function Thread({ messages, summary, onRetry, onOpenSettings, onUndo }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    following.current = isNearBottom(el);
    setShowJump(!following.current);
  };

  const jumpToLatest = () => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });

  useEffect(() => {
    const el = scroller.current;
    const last = messages.at(-1);
    if (!el || !last) return;
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    const justAsked = last.role === "user" || last.status === "pending";
    if (justAsked) {
      // Instant, not smooth: a smooth scroll fires scroll events on the way down that would read as "scrolled up".
      following.current = true;
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    } else if (!following.current) {
      setShowJump(true);
    } else {
      const node = el.querySelector<HTMLElement>(`[data-msg="${last.id}"]`);
      node?.scrollIntoView({ block: replyAlignment(node.offsetHeight, el.clientHeight), behavior });
    }
  }, [messages]);

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
