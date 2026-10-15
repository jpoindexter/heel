/** The toast after a completed task says what got done and, quietly, that things are getting done. No points, no streaks, no pressure. */
const TITLE_MAX = 28;

const PHRASES = ["Off the list.", "Done.", "One less.", "Ticked."] as const;

/** A count in words for the first few, a number after; the first one is just the fact. */
export function countLine(doneToday: number): string {
  if (doneToday <= 1) return "That's one.";
  if (doneToday === 2) return "Two down.";
  if (doneToday === 3) return "Three today.";
  return `${doneToday} today.`;
}

export function shortTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > TITLE_MAX ? `${trimmed.slice(0, TITLE_MAX - 1).trimEnd()}…` : trimmed;
}

type Input = { title: string; doneToday: number; last: string | null; rng: () => number };

/**
 * "<title> · <line>", where the line is the day's count or a short phrase, never the same line as last time.
 * `doneToday` counts this completion.
 */
export function encouragement({ title, doneToday, last, rng }: Input): string {
  const pool = [countLine(doneToday), ...PHRASES].filter((line) => line !== last);
  const line = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))] ?? PHRASES[0];
  return `${shortTitle(title)} · ${line}`;
}

/** The line part of a message made by `encouragement`, to remember as `last`. */
export const lineOf = (message: string): string => message.slice(message.lastIndexOf(" · ") + 3);
