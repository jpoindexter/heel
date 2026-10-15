import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useFocusPresence } from "../focus/useFocusPresence";
import { useActivity } from "./life/useActivity";
import { useIdleLife } from "./life/useIdleLife";
import { useLifeCommands } from "./life/useLifeCommands";
import { useRunEvents } from "./life/useRunEvents";
import { usePanelOpen } from "./life/usePanelOpen";
import { HEEL_STATES, motionDuration, parseMotionId, type MotionId } from "./sheets";
import { Sprite } from "./Sprite";
import { usePointerGestures } from "./usePointerGestures";
import { MOTION_EVENT } from "../events";

export function Mascot() {
  const [base, setBase] = useState<MotionId>(HEEL_STATES.idle);
  const [oneShot, setOneShot] = useState<MotionId | null>(null);
  const [lifeMotion, setLifeMotion] = useState<MotionId | null>(null);
  const [activity, setActivity] = useActivity();
  useFocusPresence(activity);

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

  // The app owns Greg while it is thinking or celebrating; his own life only fills the quiet.
  const busy = oneShot !== null || base !== HEEL_STATES.idle;
  const panelOpen = usePanelOpen();
  const life = useIdleLife({ activity, panelOpen, busy, setLifeMotion });
  const running = useRunEvents(life.touch);
  useLifeCommands(activity, life.asleep, { nap: life.nap, wake: life.touch, walk: life.walk, setActivity });
  useEffect(() => {
    if (panelOpen) life.touch();
  }, [panelOpen, life.touch]);

  const gestures = usePointerGestures(() => {
    life.touch();
    setOneShot(HEEL_STATES.greeting);
    void invoke("toggle_panel_command");
  });

  return (
    <div {...gestures} onPointerEnter={life.touch}>
      <Sprite motion={running ?? oneShot ?? (busy ? base : (lifeMotion ?? HEEL_STATES.idle))} label="Heel, your companion. Click to open the panel." />
    </div>
  );
}
