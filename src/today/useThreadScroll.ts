import { useEffect, useRef, useState, type RefObject } from "react";
import { replyAlignment } from "./focus-rules";
import { isNearBottom, type Message } from "./thread-model";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scrolling rules for the conversation column. New messages follow only while the person is at the bottom; scrolled up,
 * they get "Jump to latest" instead of being yanked. A new answer starts at its first line if it is taller than the view.
 */
export function useThreadScroll(messages: readonly Message[]): {
  scroller: RefObject<HTMLDivElement | null>;
  showJump: boolean;
  onScroll: () => void;
  jumpToLatest: () => void;
} {
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

  return { scroller, showJump, onScroll, jumpToLatest };
}
