import type { FocusDto } from "../../shared/api";
import { isDue } from "../../shared/focus";
import type { Activity } from "../mascot/life/config";

/** What Greg's window should do about a time-box, given what it knows. */
export type PresenceStep =
  | { kind: "none" }
  | { kind: "pose" }
  | { kind: "rest" }
  | { kind: "nudge"; reason: string };

export type PresenceMemory = { posed: boolean; nudgedFor: string | null };

type Input = { focus: FocusDto | null; now: number; activity: Activity; memory: PresenceMemory };

/** The reason a nudge is spent under: one per box, so a restart never repeats it. */
export const nudgeReason = (focus: Pick<FocusDto, "id">): string => `focus-end:${focus.id}`;

/**
 * Quiet by design. While a box runs Greg wears his focus pose; at the realistic end he may nudge once (the helper
 * decides whether the budget allows it). In Off mode he does none of it.
 */
export function decidePresence({ focus, now, activity, memory }: Input): PresenceStep {
  if (activity === "off" || !focus) return memory.posed ? { kind: "rest" } : { kind: "none" };
  if (!isDue(focus, now)) return memory.posed ? { kind: "none" } : { kind: "pose" };
  return memory.nudgedFor === focus.id ? { kind: "none" } : { kind: "nudge", reason: nudgeReason(focus) };
}
