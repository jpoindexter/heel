import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HEEL_STATES, isMotionName, motionDuration, type MotionName } from "./atlas";
import { Sprite } from "./Sprite";
import { usePointerGestures } from "./usePointerGestures";
import { MOTION_EVENT } from "../events";

export function Mascot() {
  const [base, setBase] = useState<MotionName>(HEEL_STATES.idle);
  const [oneShot, setOneShot] = useState<MotionName | null>(null);

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

  const gestures = usePointerGestures(() => {
    setOneShot(HEEL_STATES.greeting);
    void invoke("toggle_panel_command");
  });

  return (
    <div {...gestures}>
      <Sprite motion={oneShot ?? base} label="Heel, your companion. Click to open the panel." />
    </div>
  );
}
