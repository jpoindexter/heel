import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PANEL_ANCHOR_EVENT } from "../events";
import { DEFAULT_ANCHOR, anchorFromPayload, type Anchor } from "./anchor";

/** Where Greg is relative to the panel, so the tail can point at him. Asks once on load (the first show can beat the listener), then listens. */
export function usePanelAnchor(): Anchor {
  const [anchor, setAnchor] = useState<Anchor>(DEFAULT_ANCHOR);
  useEffect(() => {
    const take = (payload: unknown) => {
      const next = anchorFromPayload(payload);
      if (next) setAnchor(next);
    };
    void invoke("panel_anchor").then(take).catch(() => undefined);
    const unlisten = listen<unknown>(PANEL_ANCHOR_EVENT, (event) => take(event.payload)).catch(() => undefined);
    return () => void unlisten.then((off) => off?.());
  }, []);
  return anchor;
}
