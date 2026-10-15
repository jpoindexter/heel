import { useRef, type MouseEvent, type PointerEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const DRAG_THRESHOLD_PX = 4;

/** While pressing on Greg the window must stay clickable, wherever the pointer drifts during a drag. */
const setPressed = (pressed: boolean) => void invoke("set_mascot_pressed", { pressed }).catch(() => undefined);

/**
 * What the mouse does to Greg: a short click calls `onClick`, a press that moves past a few px drags the window,
 * and a right-click opens the native menu.
 */
export function usePointerGestures(onClick: () => void) {
  const press = useRef<{ x: number; y: number; dragging: boolean } | null>(null);

  const onPointerDown = (event: PointerEvent) => {
    press.current = { x: event.clientX, y: event.clientY, dragging: false };
    setPressed(true);
  };

  const onPointerMove = (event: PointerEvent) => {
    const start = press.current;
    if (!start || start.dragging) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_THRESHOLD_PX) {
      start.dragging = true;
      void getCurrentWindow().startDragging();
    }
  };

  const onPointerUp = () => {
    const start = press.current;
    press.current = null;
    setPressed(false);
    if (start && !start.dragging) onClick();
  };

  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    void invoke("show_mascot_menu").catch(() => undefined);
  };

  return { onPointerDown, onPointerMove, onPointerUp, onContextMenu };
}
