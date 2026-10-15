import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HEEL_STATES, motionDuration, parseMotionId, type MotionId } from "./sheets";
import { Sprite } from "./Sprite";
import { usePointerGestures } from "./usePointerGestures";
import { MOTION_EVENT } from "../events";

export function Mascot() {
  const [base, setBase] = useState<MotionId>(HEEL_STATES.idle);
  const [oneShot, setOneShot] = useState<MotionId | null>(null);

  useEffect(() => {
    const unlisten = listen<unknown>(MOTION_EVENT, (event) => {
      const motion = parseMotionId(event.payload);
      if (motion) setBase(motion.id);
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
