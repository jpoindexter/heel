import { ACTIVITIES, type Activity } from "./config";

export const ACTIVITY_STORAGE_KEY = "heel:activity";
/** Calm unless the person changed it: Greg should never be a surprise on a fresh install. */
export const DEFAULT_ACTIVITY: Activity = "calm";

export function isActivity(value: unknown): value is Activity {
  return typeof value === "string" && (ACTIVITIES as readonly string[]).includes(value);
}

/** What was saved, or the default when nothing usable was (private window, cleared storage, a value from another version). */
export function parseActivity(raw: string | null): Activity {
  return isActivity(raw) ? raw : DEFAULT_ACTIVITY;
}
