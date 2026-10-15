import { useEffect, useRef } from "react";

/**
 * Keep a view fresh: refresh when it becomes the one showing, and whenever the window is focused while it shows.
 * The panel window stays alive between uses, so data can go stale while it is hidden.
 */
export function useFocusRefresh(refresh: () => unknown, active: boolean): void {
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const onFocus = () => activeRef.current && void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);
}
