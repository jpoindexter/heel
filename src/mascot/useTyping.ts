import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { TYPING_EVENT } from "../events";

/** Whether the chat card holds text right now (the panel says so), so Greg can listen with a head tilt. */
export function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const unlisten = listen<unknown>(TYPING_EVENT, (event) => setTyping(event.payload === true)).catch(() => undefined);
    return () => void unlisten.then((off) => off?.());
  }, []);
  return typing;
}
