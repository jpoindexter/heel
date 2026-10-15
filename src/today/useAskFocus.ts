import { useEffect, type RefObject } from "react";
import { shouldFocusAskBox } from "./focus-rules";

/** Ready to type: when this view shows, and whenever the window regains focus (hotkey, click on Greg). */
export function useAskFocus(box: RefObject<HTMLTextAreaElement | null>, active: boolean): void {
  useEffect(() => {
    const focusBox = () => {
      if (shouldFocusAskBox(active, document.activeElement?.tagName ?? null)) box.current?.focus();
    };
    focusBox();
    window.addEventListener("focus", focusBox);
    return () => window.removeEventListener("focus", focusBox);
  }, [box, active]);
}
