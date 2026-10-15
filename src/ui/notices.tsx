import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { NOTICE_UNDO_EVENT } from "../events";
import { replaceNotice, routeNotice, toBubble, UndoPayloadSchema, type Notice, type ShownNotice } from "./notice-model";
import { usePanelVisible } from "./usePanelVisible";

type ShowOptions = {
  /** Only worth a notice when the panel is closed: open, the panel already shows it (the reply, its receipts). */
  whenHidden?: boolean;
};

export type Notices = {
  notice: ShownNotice | null;
  show: (notice: Notice, options?: ShowOptions) => void;
  dismiss: () => void;
  /** A time-box is running: nothing but its own notices may appear next to Greg. */
  setFocusRunning: (running: boolean) => void;
};

const NoticesContext = createContext<Notices | null>(null);

const hideBubble = () => void invoke("hide_notice").catch(() => undefined);

/** The bubble's Undo comes back as an event with the notice id; the undo itself never left this window. */
function useBubbleUndo(undos: React.RefObject<Map<number, () => void>>, dismiss: () => void) {
  useEffect(() => {
    const unlisten = listen<unknown>(NOTICE_UNDO_EVENT, (event) => {
      const parsed = UndoPayloadSchema.safeParse(event.payload);
      if (!parsed.success) return;
      const undo = undos.current.get(parsed.data.id);
      undos.current.delete(parsed.data.id);
      undo?.();
      dismiss();
      hideBubble();
    }).catch(() => undefined);
    return () => void unlisten.then((off) => off?.());
  }, [undos, dismiss]);
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
  const undos = useRef(new Map<number, () => void>());

  const dismiss = useCallback(() => setNotice(null), []);
  const show = useCallback((next: Notice, options: ShowOptions = {}) => {
    const route = routeNotice(next, flags.current);
    if (route === "silent" || (route === "panel" && options.whenHidden)) return;
    const shown = replaceNotice(null, next, ++nextId.current);
    // The toast is set either way: open the panel within the notice's life and Undo is there, by keyboard too.
    setNotice((current) => replaceNotice(current, next, shown.id));
    if (route !== "bubble") return;
    undos.current.clear();
    if (next.undo) undos.current.set(shown.id, next.undo);
    void invoke("show_notice", { payload: toBubble(shown) }).catch(() => undefined);
  }, []);
  useBubbleUndo(undos, dismiss);

  const value = useMemo<Notices>(
    () => ({ notice, show, dismiss, setFocusRunning: (running) => void (flags.current.focusRunning = running) }),
    [notice, show, dismiss],
  );
  return <NoticesContext.Provider value={value}>{children}</NoticesContext.Provider>;
}

export function useNotices(): Notices {
  const notices = useContext(NoticesContext);
  if (!notices) throw new Error("useNotices needs a <NoticesProvider> above it (the panel renders one).");
  return notices;
}
