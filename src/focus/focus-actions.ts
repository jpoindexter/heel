import { FocusStateSchema, ParkedResultSchema, type FocusDto } from "../../shared/api";
import type { FocusOutcome } from "../../shared/focus";
import type { Client } from "../api/client";
import { setMotion, settle } from "../mascot/motion-events";
import { HEEL_STATES } from "../mascot/sheets";
import { planFor, type CheckInChoice } from "./focus-model";

export type StartBox = { goal: string; taskId: string | null; realisticMin: number };

type Deps = {
  client: Client;
  setSession: (session: FocusDto | null) => void;
  /** A box that ended as "done" finishes its task too. */
  onTaskDone: (taskId: string) => void;
  onError: (message: string) => void;
};

/** What the person can do with a time-box. Each returns true when it worked; a failure is shown, never thrown. */
export function createFocusActions({ client, setSession, onTaskDone, onError }: Deps) {
  const failed = (message: string): false => {
    onError(message);
    return false;
  };

  const start = async (box: StartBox): Promise<boolean> => {
    const result = await client.post("/focus/start", FocusStateSchema, box);
    if (!result.ok) return failed(result.error.message);
    setSession(result.data.focus);
    void setMotion(HEEL_STATES.focus);
    return true;
  };

  const end = async (session: FocusDto, outcome: FocusOutcome): Promise<boolean> => {
    const result = await client.post(`/focus/${session.id}/end`, FocusStateSchema, { outcome });
    if (!result.ok) return failed(result.error.message);
    setSession(null);
    void settle();
    return true;
  };

  /** Answer the check-in. `parkedIdea` (park and return) goes to Parked first, so it is never lost. */
  const answer = async (session: FocusDto, choice: CheckInChoice, parkedIdea?: string): Promise<boolean> => {
    const plan = planFor(choice, session);
    if (parkedIdea?.trim()) {
      const parked = await client.post("/parked", ParkedResultSchema, { text: parkedIdea });
      if (!parked.ok) return failed(parked.error.message);
    }
    if (!(await end(session, plan.outcome))) return false;
    if (plan.completesTask && session.taskId) onTaskDone(session.taskId);
    return plan.next ? start({ ...plan.next, taskId: session.taskId }) : true;
  };

  return { start, end, answer };
}
