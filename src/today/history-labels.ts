const DAY_MS = 86_400_000;
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** A YYYY-MM-DD day as a local date at noon (so zone shifts never move it to the day before). */
export function dateOf(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
}

/** "Today", "Yesterday", else "Mon 13 Oct". `today` is the same YYYY-MM-DD form. */
export function dayLabel(day: string, today: string): string {
  const diff = Math.round((dateOf(today).getTime() - dateOf(day).getTime()) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const date = dateOf(day);
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** One letter for the week strip. */
export const weekdayLetter = (day: string): string => WEEKDAY_LETTERS[dateOf(day).getDay()] ?? "";

/** "3 done today", "1 done today", "Nothing done yet today". */
export function doneTodayLine(count: number): string {
  if (count === 0) return "Nothing done yet today";
  return `${count} done today`;
}

/** Today as YYYY-MM-DD, local. */
export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
