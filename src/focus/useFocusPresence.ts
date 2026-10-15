import { useEffect, useRef } from "react";
import { FocusStateSchema, SpendResultSchema } from "../../shared/api";
import { client } from "../api/default-client";
import type { Activity } from "../mascot/life/config";
import { playOnce, setMotion, settle } from "../mascot/motion-events";
import { HEEL_STATES } from "../mascot/sheets";
import { decidePresence, type PresenceMemory } from "./presence";

const POLL_MS = 15_000;

/**
 * Greg's window keeps an eye on the running time-box: focus pose while it runs, one silent nudge at the end if the
 * day's budget allows it. It only asks the helper; the helper owns the budget.
 */
export function useFocusPresence(activity: Activity): void {
  const memory = useRef<PresenceMemory>({ posed: false, nudgedFor: null });

  useEffect(() => {
    let cancelled = false;
    const look = async () => {
      const result = await client.get("/focus", FocusStateSchema);
      if (cancelled || !result.ok) return;
      const focus = result.data.focus;
      const step = decidePresence({ focus, now: Date.now(), activity, memory: memory.current });
      if (step.kind === "pose") {
        memory.current.posed = true;
        void setMotion(HEEL_STATES.focus);
      } else if (step.kind === "rest") {
        memory.current.posed = false;
        void settle();
      } else if (step.kind === "nudge" && focus) {
        memory.current = { posed: false, nudgedFor: focus.id };
        const spent = await client.post("/interrupts/spend", SpendResultSchema, { reason: step.reason });
        if (spent.ok && spent.data.allowed && !cancelled) void playOnce(HEEL_STATES.nudge);
        else void settle();
      }
    };
    void look();
    const timer = window.setInterval(() => void look(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activity]);
}
