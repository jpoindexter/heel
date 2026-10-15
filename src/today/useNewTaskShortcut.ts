import { useCallback, useEffect, useState } from "react";
import { isNewTaskKey } from "./quick-add";

/** Cmd+N from anywhere in the panel (Settings too): `onNewTask` brings the person to the box. */
export function useNewTaskShortcut(onNewTask: () => void): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isNewTaskKey(event)) return;
      event.preventDefault();
      onNewTask();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNewTask]);
}

/** Cmd+N: back to Today, the chat card open and focused. `focusSignal` changes each time, for the box to notice. */
export function useNewTaskFocus(onShow: () => void, openComposer: () => void): number {
  const [focusSignal, setFocusSignal] = useState(0);
  const onNewTask = useCallback(() => {
    onShow();
    openComposer();
    setFocusSignal((count) => count + 1);
  }, [onShow, openComposer]);
  useNewTaskShortcut(onNewTask);
  return focusSignal;
}
