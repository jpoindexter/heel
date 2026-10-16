import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { NOTICE_UNDO_EVENT } from "../events";
import { NOTICE_AFTER_HOVER_MS, NOTICE_CEILING_MS, noticeMs, replaceNotice, routeNotice, shapeOf, toBubble, UndoPayloadSchema, type Notice, type ShownNotice } from "./notice-model";
import { systemToastsOn } from "./system-toasts";
import { usePanelVisible } from "./usePanelVisible";

type ShowOptions = {
  /** Only worth a notice when the panel is closed: open, the panel already shows it (the reply, its receipts). */
  whenHidden?: boolean;
};

export type Notices = {
  notice: ShownNotice | null;
  show: (notice: Notice, options?: ShowOptions) => void;
  dismiss: () => void;
  /** The pointer is over the toast, or it has focus: it waits (up to a ceiling). `release` lets it go after a short moment. */
  hold: () => void;
  release: () => void;
  /** A time-box is running: nothing but its own notices may appear next to Greg. */
  setFocusRunning: (running: boolean) => void;
};

const NoticesContext = createContext<Notices | null>(null);

const hideBubble = () => void invoke("hide_notice").catch(() => undefined);

/** The bubble's Undo or choice comes back as an event with the notice id; the functions never left this window. */
function useBubbleUndo(undos: React.RefObject<Map<number, (choice?: number) => void>>, dismiss: () => void) {
  useEffect(() => {
    const unlisten = listen<unknown>(NOTICE_UNDO_EVENT, (event) => {
      const parsed = UndoPayloadSchema.safeParse(event.payload);
      if (!parsed.success) return;
      const act = undos.current.get(parsed.data.id);
      undos.current.delete(parsed.data.id);
      act?.(parsed.data.choice);
      dismiss();
      hideBubble();
    }).catch(() => undefined);
    return () => void unlisten.then((off) => off?.());
  }, [undos, dismiss]);
}

/** The toast's two clocks: its own life (restarted by hover and focus), and a ceiling nothing can hold past. */
function useNoticeClock(onExpire: () => void) {
  const clock = useRef<number | undefined>(undefined);
  const ceiling = useRef<number | undefined>(undefined);
  const hold = useCallback(() => window.clearTimeout(clock.current), []);
  const stop = useCallback(() => {
    window.clearTimeout(clock.current);
    window.clearTimeout(ceiling.current);
  }, []);
  /** Start the clock: the notice's own life when it has just arrived, the short after-hover moment when held. */
  const arm = useCallback(
    (ms: number) => {
      window.clearTimeout(clock.current);
      clock.current = window.setTimeout(onExpire, ms);
    },
    [onExpire],
  );
  const release = useCallback(() => arm(NOTICE_AFTER_HOVER_MS), [arm]);
  const startCeiling = useCallback(() => {
    window.clearTimeout(ceiling.current);
    ceiling.current = window.setTimeout(onExpire, NOTICE_CEILING_MS);
  }, [onExpire]);
  useEffect(() => stop, [stop]);
  return { hold, arm, release, stop, startCeiling };
}

/**
 * The one notice system: in the panel it is the toast at the top edge; with the panel closed it is a bubble
 * next to Greg (the shell places a tiny window over his head). Routing is `routeNotice`, pure and tested.
 */
export function NoticesProvider({ quiet, children }: { quiet: boolean; children: ReactNode }) {
  const [notice, setNotice] = useState<ShownNotice | null>(null);
  const panelVisible = usePanelVisible();
  const flags = useRef({ panelVisible, quiet, focusRunning: false });
  flags.current.panelVisible = panelVisible;
  flags.current.quiet = quiet;
  const nextId = useRef(0);
  const undos = useRef(new Map<number, (choice?: number) => void>());

  // The toast's clock is ours, not Radix's: Radix pauses while the window is unfocused, which left toasts stuck for good.
  const expire = useRef(() => {});
  const { hold, arm, release, stop, startCeiling } = useNoticeClock(() => expire.current());
  const dismiss = useCallback(() => {
    stop();
    setNotice(null);
  }, [stop]);
  expire.current = dismiss;
  // Set while the panel was closed, a toast gets its full time once the panel is on screen.
  useEffect(() => {
    if (panelVisible && notice) arm(noticeMs(shapeOf(notice)));
  }, [panelVisible, notice, arm]);

  const show = useCallback((next: Notice, options: ShowOptions = {}) => {
    const route = routeNotice(next, flags.current);
    if (route === "silent" || (route === "panel" && options.whenHidden)) return;
    const shown = replaceNotice(null, next, ++nextId.current);
    // The toast is set either way: open the panel within the notice's life and Undo is there, by keyboard too.
    setNotice((current) => replaceNotice(current, next, shown.id));
    arm(noticeMs(shapeOf(next)));
    startCeiling();
    if (route !== "bubble") return;
    if (systemToastsOn()) void invoke("system_notify", { title: "Heel", body: next.message }).catch(() => undefined);
    undos.current.clear();
    if (next.undo || next.choices) undos.current.set(shown.id, (choice) => (choice === undefined ? next.undo?.() : next.choices?.[choice]?.run()));
    void invoke("show_notice", { payload: toBubble(shown) }).catch(() => undefined);
  }, [arm, startCeiling]);
  useBubbleUndo(undos, dismiss);

  const value = useMemo<Notices>(
    () => ({ notice, show, dismiss, hold, release, setFocusRunning: (running) => void (flags.current.focusRunning = running) }),
    [notice, show, dismiss, hold, release],
  );
  return <NoticesContext.Provider value={value}>{children}</NoticesContext.Provider>;
}

export function useNotices(): Notices {
  const notices = useContext(NoticesContext);
  if (!notices) throw new Error("useNotices needs a <NoticesProvider> above it (the panel renders one).");
  return notices;
}
