import { useCallback, useEffect, useState } from "react";
import { isNewTaskKey } from "./quick-add";

/** Cmd+N from anywhere in the panel (Settings too): `onNewTask` brings the person to the input, set to Add. */
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

/** Cmd+N: back to Today, input set to Add and focused. `focusSignal` changes each time, for the input to notice. */
export function useNewTaskFocus(onShow: () => void, setMode: (mode: "add") => void): number {
  const [focusSignal, setFocusSignal] = useState(0);
  const onNewTask = useCallback(() => {
    onShow();
    setMode("add");
    setFocusSignal((count) => count + 1);
  }, [onShow, setMode]);
  useNewTaskShortcut(onNewTask);
  return focusSignal;
}
