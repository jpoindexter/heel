import { useCallback, useEffect, useRef, useState } from "react";
import { COLLAPSE_AFTER_MS, TRAY_ROLL_BACK_MS } from "./bar-model";

type Timers = { collapse?: number; tray?: number };

/**
 * The bar's two folds: the chat card (open or the one pill) and the + tray (rolled out or not).
 * The tray rolls back before anything runs; the card folds back by itself a moment after it is left empty.
 */
export function useBar(isDraftEmpty: () => boolean) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [trayClosing, setTrayClosing] = useState(false);
  const timers = useRef<Timers>({});

  const cancelCollapse = useCallback(() => window.clearTimeout(timers.current.collapse), []);
  useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearTimeout(t)), []);

  const openComposer = useCallback(() => {
    cancelCollapse();
    setComposerOpen(true);
  }, [cancelCollapse]);

  const closeComposer = useCallback(() => {
    cancelCollapse();
    setComposerOpen(false);
  }, [cancelCollapse]);

  const collapseSoon = useCallback(
    (reason: keyof typeof COLLAPSE_AFTER_MS) => {
      cancelCollapse();
      timers.current.collapse = window.setTimeout(() => {
        if (isDraftEmpty()) setComposerOpen(false);
      }, COLLAPSE_AFTER_MS[reason]);
    },
    [cancelCollapse, isDraftEmpty],
  );

  /** Roll the four buttons back (last first), then do the thing. */
  const closeTray = useCallback((then?: () => void) => {
    window.clearTimeout(timers.current.tray);
    setTrayClosing(true);
    timers.current.tray = window.setTimeout(() => {
      setTrayOpen(false);
      setTrayClosing(false);
      then?.();
    }, TRAY_ROLL_BACK_MS);
  }, []);

  const toggleTray = useCallback(() => {
    cancelCollapse();
    if (trayOpen) closeTray();
    else setTrayOpen(true);
  }, [cancelCollapse, closeTray, trayOpen]);

  return { composerOpen, trayOpen, trayClosing, openComposer, closeComposer, collapseSoon, cancelCollapse, closeTray, toggleTray };
}
