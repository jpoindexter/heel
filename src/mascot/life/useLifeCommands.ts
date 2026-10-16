import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { LIFE_COMMAND_EVENT } from "../../events";
import type { Activity } from "./config";
import { useReducedMotion } from "../useReducedMotion";

type Handlers = { nap: () => void; wake: () => void; walk: () => void; play: () => void; setActivity: (next: Activity) => void };

/** What Greg's right-click menu can ask for, and telling the menu his state (so it can say "Wake up" and tick "Quiet mode"). */
export function useLifeCommands(activity: Activity, asleep: boolean, { nap, wake, walk, play, setActivity }: Handlers): void {
  useEffect(() => {
    const unlisten = listen<string>(LIFE_COMMAND_EVENT, (event) => {
      if (event.payload === "nap") nap();
      if (event.payload === "wake") wake();
      if (event.payload === "walk") walk();
      if (event.payload === "play") play();
      if (event.payload === "toggle-quiet") setActivity(activity === "off" ? "calm" : "off");
    }).catch(() => undefined);
    return () => void unlisten.then((off) => off?.());
  }, [activity, nap, wake, walk, play, setActivity]);

  const reducedMotion = useReducedMotion();
  useEffect(() => {
    void invoke("set_life_flags", { quiet: activity === "off", asleep, reducedMotion }).catch(() => undefined);
  }, [activity, asleep, reducedMotion]);
}
