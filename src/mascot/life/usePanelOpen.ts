import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { PANEL_VISIBLE_EVENT } from "../../events";

/** Whether the panel is open, as told by the shell. Greg stays still while it is. Outside Tauri there is no shell: always closed. */
export function usePanelOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const unlisten = listen<boolean>(PANEL_VISIBLE_EVENT, (event) => setOpen(event.payload)).catch(() => undefined);
    return () => void unlisten.then((off) => off?.());
  }, []);
  return open;
}
