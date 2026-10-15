import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { z } from "zod";
import { NudgeResultSchema, type NudgeDto } from "../../shared/api";
import { DEFAULT_TIME_BOX_MIN } from "../../shared/focus";
import { client } from "../api/default-client";
import { ATTENTION_EVENT } from "../events";
import { useActivity } from "../mascot/life/useActivity";
import { nudge } from "../mascot/motion-events";
import { useAttentionSettings } from "../ui/attention";
import type { Layers } from "../ui/layers";
import { useMethod } from "../ui/method";
import { useNotices } from "../ui/notices";
import type { useBarActions } from "./useBarActions";
import type { useTodayState } from "./useTodayState";

/** How often the shell samples (src-tauri/src/constants.rs ATTENTION_INTERVAL_MS). */
const INTERVAL_SEC = 5;
const ShellSample = z.object({ bundle: z.string(), name: z.string(), idle_sec: z.number() });

type Deps = { state: ReturnType<typeof useTodayState>; bar: ReturnType<typeof useBarActions>; layers: Layers };

/** What each choice does. Labels are the contract with shared/attention.ts. */
function actFor(label: string, { state, bar, layers }: Deps, pomodoroTimer: boolean): () => void {
  const { now, focus, pomodoro, tasks } = state;
  if (label === "Back to it") return () => void nudge();
  if (label === "Park it")
    return () => {
      layers.home();
      bar.openComposer();
      tasks.showNotice("Type what pulled you away, then + › Park.");
    };
  if (label === "Stop the box") return () => void (pomodoro.view?.state ? pomodoro.move("stop") : focus.stop());
  if (label.startsWith("Start"))
    return () => {
      if (!now) return;
      if (pomodoroTimer) void pomodoro.start(now.text, now.task.id);
      else void focus.start({ goal: now.text, taskId: now.task.id, realisticMin: DEFAULT_TIME_BOX_MIN });
    };
  return () => undefined;
}

/** Samples from the shell go to the helper; a nudge comes back as one notice with its choices. Nothing moves while the switch is off. */
export function useAttention(deps: Deps): void {
  const { settings } = useAttentionSettings();
  const { method } = useMethod();
  const notices = useNotices();
  const [activity] = useActivity();
  const latest = useRef({ deps, quiet: activity === "off", pomodoroTimer: method.timer === "pomodoro" });
  latest.current = { deps, quiet: activity === "off", pomodoroTimer: method.timer === "pomodoro" };

  useEffect(() => {
    if (!settings.enabled) return;
    const show = (nudge: NudgeDto) => {
      const { deps: now, pomodoroTimer } = latest.current;
      notices.show({ message: nudge.text, tone: "info", aboutFocus: true, choices: nudge.choices.map((label) => ({ label, run: actFor(label, now, pomodoroTimer) })) });
    };
    const unlisten = listen<unknown>(ATTENTION_EVENT, async (event) => {
      const sample = ShellSample.safeParse(event.payload);
      if (!sample.success) return;
      const { bundle, name, idle_sec } = sample.data;
      const result = await client.post("/attention/sample", NudgeResultSchema, { bundle, name, idleSec: idle_sec, intervalSec: INTERVAL_SEC, quiet: latest.current.quiet });
      if (result.ok && result.data.nudge) show(result.data.nudge);
    }).catch(() => undefined);
    return () => void unlisten.then((off) => off?.());
  }, [settings.enabled, notices]);
}
