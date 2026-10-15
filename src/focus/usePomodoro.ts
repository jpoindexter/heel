import { useCallback, useEffect, useRef, useState } from "react";
import { PomodoroViewSchema, type PomodoroViewDto } from "../../shared/api";
import type { Client } from "../api/client";
import { playOnce, settle } from "../mascot/motion-events";
import { HEEL_STATES } from "../mascot/sheets";
import type { Notice } from "../ui/notice-model";

/** The strip shows minutes, so a tick every half minute is enough; the phase end gets its own exact timer. */
const TICK_MS = 30_000;
const EDGE_MS = 300;

export type Move = "pause" | "resume" | "skip" | "next" | "stop";

type Options = { active: boolean; notify: (notice: Notice) => void };

/** What a phase end says. About the time-box, so it may still reach Greg's bubble during one. */
function endNotice(ended: "work" | "short" | "long", view: PomodoroViewDto): Notice {
  const state = view.state;
  if (ended === "work") return { message: state?.waiting ? "Work done. Take the break?" : "Work done. Break started.", tone: "info", aboutFocus: true };
  return { message: state?.waiting ? "Break over. Ready for the next?" : "Break over. Back to work.", tone: "info", aboutFocus: true };
}

/** Ask again when the phase is due (exactly), and every half minute meanwhile for the countdown. */
function useDueReload(view: PomodoroViewDto | null, load: () => Promise<void>): void {
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    const state = view?.state;
    if (!state || state.waiting || state.paused) return;
    timer.current = window.setTimeout(() => void load(), Math.min(TICK_MS, Math.max(EDGE_MS, view.remainingMs + EDGE_MS)));
    return () => window.clearTimeout(timer.current);
  }, [view, load]);
}

/** The helper owns the clock; this asks it, presses its buttons, and says so when a phase ends. */
export function usePomodoro(client: Client, { active, notify }: Options) {
  const [view, setView] = useState<PomodoroViewDto | null>(null);

  const take = useCallback(
    (next: PomodoroViewDto) => {
      setView(next);
      if (next.ended) {
        notify(endNotice(next.ended, next));
        if (next.ended === "work") void playOnce(HEEL_STATES.stretch);
        else void settle();
      }
    },
    [notify],
  );

  const load = useCallback(async () => {
    const result = await client.get("/pomodoro", PomodoroViewSchema);
    if (result.ok) take(result.data);
  }, [client, take]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  useDueReload(view, load);

  const start = useCallback(
    async (goal: string, taskId: string | null): Promise<boolean> => {
      const result = await client.post("/pomodoro/start", PomodoroViewSchema, { goal, taskId });
      if (!result.ok) return (notify({ message: result.error.message, tone: "error" }), false);
      take(result.data);
      return true;
    },
    [client, notify, take],
  );

  const move = useCallback(
    async (which: Move) => {
      const result = await client.post(`/pomodoro/${which}`, PomodoroViewSchema);
      if (!result.ok) return notify({ message: result.error.message, tone: "error" });
      take(result.data);
      if (which === "stop" || (which === "next" && result.data.state?.phase !== "work")) void settle();
    },
    [client, notify, take],
  );

  return { view, start, move, reload: load };
}
