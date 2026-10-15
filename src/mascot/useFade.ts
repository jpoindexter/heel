import { useEffect, useState, type CSSProperties } from "react";
import { listen } from "@tauri-apps/api/event";
import { FADE_EVENT } from "../events";
import { fadeFromPayload, type Fade } from "./fade";

const VISIBLE: Fade = { opacity: 1, ms: 0 };

/** Greg's opacity, as a style. Fully visible until the shell asks him to fade (reduced motion hides and shows him this way). */
export function useFade(): CSSProperties {
  const [fade, setFade] = useState<Fade>(VISIBLE);
  useEffect(() => {
    const unlisten = listen<unknown>(FADE_EVENT, (event) => {
      const next = fadeFromPayload(event.payload);
      if (next) setFade(next);
    }).catch(() => undefined);
    return () => void unlisten.then((off) => off?.());
  }, []);
  return { opacity: fade.opacity, transitionProperty: "opacity", transitionDuration: `${fade.ms}ms` };
}
