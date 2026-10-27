import { z } from "zod";

/**
 * The log Heel keeps about itself (N30): what happened, where and when. It never holds what the person wrote,
 * a message, mail or a task title: callers pass a place and a fact, and the text is cut short anyway.
 * It lives in localStorage so a crash followed by Reload keeps the trail.
 */
export const DEBUG_LOG_KEY = "heel:debug-log";
export const DEBUG_LOG_CAP = 200;
const TEXT_MAX = 300;

export const LEVELS = ["info", "warn", "error"] as const;
export type Level = (typeof LEVELS)[number];

const EntrySchema = z.object({ at: z.number(), level: z.enum(LEVELS), where: z.string(), text: z.string() });
export type DebugEntry = z.output<typeof EntrySchema>;

/** Whatever was stored: every entry that still parses, in order, never past the cap. Garbage is an empty log, never a throw. */
export function parseLog(raw: string | null, cap = DEBUG_LOG_CAP): DebugEntry[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .flatMap((item) => {
        const parsed = EntrySchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      })
      .slice(-cap);
  } catch {
    return [];
  }
}

/** The ring: newest last, the oldest dropped past the cap, the text one line and short. */
export function append(log: readonly DebugEntry[], entry: DebugEntry, cap = DEBUG_LOG_CAP): DebugEntry[] {
  const text = entry.text.replace(/\s+/g, " ").trim().slice(0, TEXT_MAX);
  return [...log, { ...entry, text }].slice(-cap);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local time, the way a person reads it: 2026-10-27 09:05:03. */
export function stamp(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const formatEntry = (entry: DebugEntry): string => `${stamp(entry.at)} ${entry.level.padEnd(5)} ${entry.where}: ${entry.text}`;
export const formatLog = (log: readonly DebugEntry[]): string => log.map(formatEntry).join("\n");

/* The localStorage adapter. Every call swallows storage failures: a log must never be the thing that breaks. */

export function readDebugLog(): DebugEntry[] {
  try {
    return parseLog(window.localStorage.getItem(DEBUG_LOG_KEY));
  } catch {
    return [];
  }
}

export function logDebug(level: Level, where: string, text: string, now: () => number = Date.now): void {
  try {
    window.localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(append(readDebugLog(), { at: now(), level, where, text })));
  } catch {
    /* not kept this time */
  }
}

export function clearDebugLog(): void {
  try {
    window.localStorage.removeItem(DEBUG_LOG_KEY);
  } catch {
    /* nothing to clear */
  }
}
