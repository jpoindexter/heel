import { useEffect } from "react";
import { emit } from "@tauri-apps/api/event";
import { TYPING_EVENT } from "../events";
import { TYPING_CLEAR_MS } from "./bar-model";

/** Tell Greg's window when the chat card holds text (at once) and when it empties (after a short pause, so a retype does not flicker him). */
export function useTypingSignal(draft: string): void {
  const active = draft.trim().length > 0;
  useEffect(() => {
    if (active) {
      void emit(TYPING_EVENT, true).catch(() => undefined);
      return;
    }
    const timer = window.setTimeout(() => void emit(TYPING_EVENT, false).catch(() => undefined), TYPING_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [active]);
}
