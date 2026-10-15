import { useEffect, useRef, useState, type PointerEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { HEEL_STATES, isMotionName, motionDuration, type MotionName } from "./atlas";
import { Sprite } from "./Sprite";
import { MOTION_EVENT } from "../events";

const DRAG_THRESHOLD_PX = 4;

export function Mascot() {
  const [base, setBase] = useState<MotionName>(HEEL_STATES.idle);
  const [oneShot, setOneShot] = useState<MotionName | null>(null);
  const press = useRef<{ x: number; y: number; dragging: boolean } | null>(null);

  useEffect(() => {
    const unlisten = listen<unknown>(MOTION_EVENT, (event) => {
      if (isMotionName(event.payload)) setBase(event.payload);
    });
    return () => void unlisten.then((off) => off());
  }, []);

  useEffect(() => {
    if (!oneShot) return;
    const timer = window.setTimeout(() => setOneShot(null), motionDuration(oneShot));
    return () => window.clearTimeout(timer);
  }, [oneShot]);

  const onPointerDown = (event: PointerEvent) => {
    press.current = { x: event.clientX, y: event.clientY, dragging: false };
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
    if (!start || start.dragging) return;
    setOneShot(HEEL_STATES.greeting);
    void invoke("toggle_panel_command");
  };

  return (
    <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <Sprite motion={oneShot ?? base} label="Heel, your companion. Click to open the panel." />
    </div>
  );
}
