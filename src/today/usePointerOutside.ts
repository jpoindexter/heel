import { useCallback } from "react";

/** A press anywhere outside the open card folds it, but only when it is empty: typed text is never lost. */
export function usePointerOutside(composerOpen: boolean, isDraftEmpty: () => boolean, close: () => void) {
  return useCallback(
    (event: { target: EventTarget | null }) => {
      if (!composerOpen || !isDraftEmpty()) return;
      if (event.target instanceof Element && event.target.closest(".compose")) return;
      close();
    },
    [close, composerOpen, isDraftEmpty],
  );
}
