import type { Method, Sizing, Structure, Timer } from "../../shared/method";
import type { Activity } from "../mascot/life/config";
import type { Preference } from "../theme/appearance";
import type { Density } from "../theme/density";
import type { Capacity } from "../ui/capacity";

/* The words every settings control shows, in one place, so a group's at-rest summary says the same thing as its control. */

export const PREFERENCE_LABELS: Record<Preference, string> = { system: "System", light: "Light", dark: "Dark" };
export const DENSITY_LABELS: Record<Density, string> = { compact: "Compact", comfortable: "Comfortable" };
export const ACTIVITY_LABELS: Record<Activity, string> = { off: "Off", calm: "Calm", lively: "Lively" };
export const TIMER_LABELS: Record<Timer, string> = { timebox: "Time-box", pomodoro: "Pomodoro" };
export const STRUCTURE_LABELS: Record<Structure, string> = { none: "None", "pickle-jar": "Pickle jar", "one-three-five": "1-3-5", eisenhower: "Eisenhower", frog: "Frog", "two-minute": "Two-minute rule", "ivy-lee": "Ivy Lee" };
export const SIZING_LABELS: Record<Sizing, string> = { none: "None", tshirt: "T-shirt" };
export const CAPACITY_LABELS: Record<Capacity, string> = { normal: "Normal", low: "Low", off: "Off" };

/** What a folded group says at rest (N4): the current values, so nobody opens a group just to check. */
export const lookSummary = (preference: Preference, density: Density): string => `${PREFERENCE_LABELS[preference]} · ${DENSITY_LABELS[density]}`;

export function gregSummary(activity: Activity, notices: boolean, attention: boolean): string {
  return `${ACTIVITY_LABELS[activity]} · notices ${notices ? "on" : "off"} · attention ${attention ? "on" : "off"}`;
}

/** What a number field should store on blur: a positive number that differs from what is stored; null for empty, nonsense, zero or no change. */
export function numberToCommit(text: string, current: number): number | null {
  const trimmed = text.trim();
  const next = Number(trimmed);
  return trimmed === "" || !Number.isFinite(next) || next <= 0 || next === current ? null : next;
}

/** The wander list as typed, one bundle id per line, blanks dropped. */
export function parseWanderList(text: string): string[] {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function workSummary(method: Method, capacity: Capacity = "normal"): string {
  const parts = [TIMER_LABELS[method.timer]];
  if (capacity !== "normal") parts.unshift(`${CAPACITY_LABELS[capacity]} capacity`);
  if (method.structure !== "none") parts.push(STRUCTURE_LABELS[method.structure]);
  if (method.sizing !== "none") parts.push(SIZING_LABELS[method.sizing]);
  return parts.join(" · ");
}
