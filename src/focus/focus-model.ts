import type { FocusDto } from "../../shared/api";
import { RETURN_BOX_MIN, dueAt, extensionMin, type FocusOutcome } from "../../shared/focus";

/** The three ways out of a check-in. Wording never judges: none of them is the wrong answer. */
export type CheckInChoice = "keep_going" | "park_and_return" | "done";

export type NextBox = { goal: string; realisticMin: number };

export type CheckInPlan = {
  outcome: FocusOutcome;
  /** A fresh box to start straight away, or null when the work is finished. */
  next: NextBox | null;
  /** The task behind the box is done too. */
  completesTask: boolean;
};

/** The person's own words, quoted exactly as they typed them. */
export const checkInQuestion = (goal: string): string => `Where are you vs “${goal}”?`;

export function planFor(choice: CheckInChoice, session: Pick<FocusDto, "goal" | "taskId" | "realisticMin" | "worstMin" | "startedAt">): CheckInPlan {
  switch (choice) {
    case "keep_going":
      return { outcome: "continued", next: { goal: session.goal, realisticMin: extensionMin(session) }, completesTask: false };
    case "park_and_return":
      return { outcome: "parked_and_returned", next: { goal: session.goal, realisticMin: RETURN_BOX_MIN }, completesTask: false };
    case "done":
      return { outcome: "done", next: null, completesTask: session.taskId !== null };
  }
}

/** "14:32": when the box is up, in the person's own clock format. */
export const endsAtText = (session: Pick<FocusDto, "startedAt" | "realisticMin" | "worstMin">, locale?: string): string =>
  new Date(dueAt(session)).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });

/** How long until the check-in is due; 0 once it is. */
export const msUntilDue = (session: Pick<FocusDto, "startedAt" | "realisticMin" | "worstMin">, now: number): number =>
  Math.max(0, dueAt(session) - now);
