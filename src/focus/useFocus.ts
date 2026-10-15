import { useCallback, useEffect, useMemo, useState } from "react";
import { FocusStateSchema, type FocusDto } from "../../shared/api";
import { isDue } from "../../shared/focus";
import type { Client } from "../api/client";
import { useFocusRefresh } from "../ui/useFocusRefresh";
import { createFocusActions } from "./focus-actions";
import { msUntilDue, type CheckInChoice } from "./focus-model";

type Options = { active: boolean; onTaskDone: (taskId: string) => void; onError: (message: string) => void };

/** The current time, updated once when the box becomes due. No ticking, no polling. */
function useClockAtDue(session: FocusDto | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!session) return;
    const wait = msUntilDue(session, Date.now());
    if (wait === 0) return void setNow(Date.now());
    const timer = window.setTimeout(() => setNow(Date.now()), wait);
    return () => window.clearTimeout(timer);
  }, [session]);
  return now;
}

/** The running time-box and what the person can do with it. */
export function useFocus(client: Client, { active, onTaskDone, onError }: Options) {
  const [session, setSession] = useState<FocusDto | null>(null);
  const now = useClockAtDue(session);

  const refresh = useCallback(async () => {
    const result = await client.get("/focus", FocusStateSchema);
    if (result.ok) setSession(result.data.focus);
  }, [client]);
  useFocusRefresh(refresh, active);

  const actions = useMemo(() => createFocusActions({ client, setSession, onTaskDone, onError }), [client, onTaskDone, onError]);

  return {
    session,
    due: session ? isDue(session, Math.max(now, Date.now())) : false,
    start: actions.start,
    stop: () => (session ? actions.end(session, "abandoned") : Promise.resolve(false)),
    answer: (choice: CheckInChoice, parkedIdea?: string) => (session ? actions.answer(session, choice, parkedIdea) : Promise.resolve(false)),
  };
}
