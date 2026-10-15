import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../design/tokens.css";
import "./mascot.css";
import { useFocusPresence } from "../focus/useFocusPresence";
import { useAppearance } from "../theme/useAppearance";
import { useActivity } from "./life/useActivity";
import { MOTIONS } from "./life/config";
import { useIdleLife } from "./life/useIdleLife";
import { useLifeCommands } from "./life/useLifeCommands";
import { usePointerLife } from "./life/usePointerLife";
import { useRunEvents } from "./life/useRunEvents";
import { useFade } from "./useFade";
import { usePanelOpen } from "./life/usePanelOpen";
import { HEEL_STATES, motionDuration, parseMotionId, type MotionId } from "./sheets";
import { Sprite } from "./Sprite";
import { ThoughtBubble } from "./ThoughtBubble";
import { usePointerGestures } from "./usePointerGestures";
import { useReducedMotion } from "./useReducedMotion";
import { useTyping } from "./useTyping";
import { useWork } from "./useWork";
import { useWorkMotion } from "./useWorkMotion";
import { MOTION_EVENT } from "../events";

/** The pose the app asks for by event (celebrate, stumble, focus...) and the one-shot a click plays. */
function useAskedMotion() {
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
  return { base, oneShot, setOneShot };
}

function Greg() {
  const { base, oneShot, setOneShot } = useAskedMotion();
  const [lifeMotion, setLifeMotion] = useState<MotionId | null>(null);
  const [activity, setActivity] = useActivity();
  useFocusPresence(activity);
  const fadeStyle = useFade();
  const panelOpen = usePanelOpen();
  const working = useWork();
  const reducedMotion = useReducedMotion();
  const work = useWorkMotion({ working, panelOpen, reducedMotion, quiet: activity === "off" });

  // The app owns Greg while Heel works, thinks or celebrates; his own life only fills the quiet.
  const busy = working || oneShot !== null || base !== HEEL_STATES.idle;
  const life = useIdleLife({ activity, panelOpen, busy, setLifeMotion });
  const running = useRunEvents(life.touch, life.greet);
  useLifeCommands(activity, life.asleep, { nap: life.nap, wake: life.wake, walk: life.walk, setActivity });
  useEffect(() => {
    if (panelOpen) life.touch();
  }, [panelOpen, life.touch]);
  // Free to look about: nothing else is showing on him and nothing is being done to him.
  const free = lifeMotion === null && !busy && !life.asleep && running === null;
  const gaze = usePointerLife({ activity, free, reducedMotion, come: life.come, stretch: life.stretch });
  const typing = useTyping();

  const gestures = usePointerGestures(() => {
    life.wake();
    setOneShot(HEEL_STATES.greeting);
    void invoke("toggle_panel_command");
  });

  // An asked-for nap outranks work and the app's pose; a run or a one-shot still shows over it. When he is free: the
  // listening tilt while the chat card holds text, else his gaze toward the pointer, else sitting.
  const own = lifeMotion ?? (typing && free ? MOTIONS.listening : (gaze ?? HEEL_STATES.idle));
  const motion = running ?? oneShot ?? (life.asleep ? own : (work.motion ?? (busy ? base : own)));
  return (
    <div {...gestures} onPointerEnter={life.touch} style={fadeStyle} className={work.move === "sway" ? "sway" : undefined}>
      <Sprite motion={motion} label="Heel, your companion. Click to open the panel." />
      {work.bubble && <ThoughtBubble />}
    </div>
  );
}

/** Greg's window. The Theme gives the thought bubble its colours; the window itself stays transparent. */
export function Mascot() {
  const { appearance } = useAppearance();
  return (
    <Theme appearance={appearance} accentColor="jade" grayColor="sand" radius="small" hasBackground={false} className="mascot-theme">
      <Greg />
    </Theme>
  );
}
