import { useLayoutEffect, type RefObject } from "react";

/** A text box that is one line until the text needs more; the CSS `max-height` stops it (then it scrolls). */
export function useAutoGrow(box: RefObject<HTMLTextAreaElement | null>, value: string): void {
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [box, value]);
}
