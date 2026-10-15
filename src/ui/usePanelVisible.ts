import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PANEL_VISIBLE_EVENT } from "../events";

/** Whether the panel window is on screen, as the shell says. Outside Tauri (the browser preview) it always is. */
export function usePanelVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    void invoke<boolean>("panel_visible").then(setVisible).catch(() => undefined);
    const unlisten = listen<boolean>(PANEL_VISIBLE_EVENT, (event) => setVisible(event.payload)).catch(() => undefined);
    return () => void unlisten.then((off) => off?.());
  }, []);
  return visible;
}
