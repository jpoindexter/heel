import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { Button, Text, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../design/tokens.css";
import "./notice.css";
import { NOTICE_EVENT, NOTICE_UNDO_EVENT } from "../events";
import { SCALING } from "../theme/density";
import { useAppearance } from "../theme/useAppearance";
import { useDensity } from "../theme/useDensity";
import { BubblePayloadSchema, NOTICE_AFTER_HOVER_MS, noticeMs, type BubblePayload } from "../ui/notice-model";

/** If the exit animation never reports its end (reduced motion, a hidden tab), the window still goes away. */
const LEAVE_FALLBACK_MS = 400;

const hideWindow = () => void invoke("hide_notice").catch(() => undefined);

/** What is showing, and the clock that fades it: the notice's own life from arrival, paused while the pointer is over it. */
function useBubble() {
  const [bubble, setBubble] = useState<BubblePayload | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const stop = () => window.clearTimeout(timer.current);
  const leave = useCallback(() => {
    stop();
    setLeaving(true);
    timer.current = window.setTimeout(hideWindow, LEAVE_FALLBACK_MS);
  }, []);
  const arm = useCallback(
    (ms: number) => {
      stop();
      timer.current = window.setTimeout(leave, ms);
    },
    [leave],
  );

  useEffect(() => {
    const unlisten = listen<unknown>(NOTICE_EVENT, (event) => {
      const parsed = BubblePayloadSchema.safeParse(event.payload);
      if (!parsed.success) return;
      setLeaving(false);
      setBubble(parsed.data);
      arm(noticeMs({ tone: parsed.data.tone, undoable: parsed.data.undoable, choices: parsed.data.choices.length }));
    }).catch(() => undefined);
    return () => {
      stop();
      void unlisten.then((off) => off?.());
    };
  }, [arm]);

  const gone = () => {
    stop();
    setBubble(null);
    hideWindow();
  };
  return { bubble, leaving, hold: stop, release: () => arm(NOTICE_AFTER_HOVER_MS), leave, gone };
}

/** The small notice window next to Greg: one line of what happened, Undo when it can be undone, a tail pointing at him. */
export function NoticeBubble() {
  const { appearance } = useAppearance();
  const [density] = useDensity();
  const { bubble, leaving, hold, release, leave, gone } = useBubble();
  const answer = (choice?: number) => {
    if (bubble) void emit(NOTICE_UNDO_EVENT, { id: bubble.id, choice }).catch(() => undefined);
    leave();
  };
  return (
    <Theme appearance={appearance} accentColor="jade" grayColor="sand" radius="small" scaling={SCALING[density]} panelBackground="solid" hasBackground={false} className="notice-theme">
      {bubble && (
        <div
          role="status"
          className="notice"
          data-tone={bubble.tone}
          data-leaving={leaving || undefined}
          onPointerEnter={hold}
          onPointerLeave={release}
          onAnimationEnd={() => leaving && gone()}
        >
          <Text size="2" className="notice-text">{bubble.message}</Text>
          {bubble.choices.map((label, index) => (
            <Button key={label} size="1" variant="soft" color="gray" onClick={() => answer(index)}>{label}</Button>
          ))}
          {bubble.undoable && bubble.choices.length === 0 && (
            <Button size="1" variant="soft" highContrast onClick={() => answer()}>Undo</Button>
          )}
          <span className="notice-tail" aria-hidden="true" />
        </div>
      )}
    </Theme>
  );
}
