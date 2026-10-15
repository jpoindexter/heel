import type { Ctx } from "./context";
import type { Task } from "./schema";
import { toTask } from "./tasks";

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

/** The local calendar day of a moment, YYYY-MM-DD. The helper runs on the person's Mac, so local time is their day. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type HistoryDay = { date: string; count: number; tasks: Task[] };
export type WeekDay = { date: string; count: number };
export type History = { days: HistoryDay[]; week: WeekDay[] };

/** Done tasks finished at or after `since`, newest first. */
export function listDone(ctx: Ctx, since: number): Task[] {
  return ctx.db
    .prepare("SELECT * FROM tasks WHERE status = 'done' AND completed_at >= ? ORDER BY completed_at DESC")
    .all(since)
    .map(toTask);
}

/** Newest day first; tasks keep their newest-first order inside each day. */
export function groupByDay(done: readonly Task[]): HistoryDay[] {
  const days = new Map<string, Task[]>();
  for (const task of done) {
    const key = dayKey(task.completedAt ?? task.updatedAt);
    days.set(key, [...(days.get(key) ?? []), task]);
  }
  return [...days.entries()].map(([date, tasks]) => ({ date, count: tasks.length, tasks }));
}

/** The last `length` days ending today, oldest first, each with how many were finished: a plain count, never a streak. */
export function weekOf(done: readonly Task[], now: number, length: number): WeekDay[] {
  const counts = new Map<string, number>();
  for (const task of done) {
    const key = dayKey(task.completedAt ?? task.updatedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const today = startOfDay(now);
  return Array.from({ length }, (_, i) => {
    const date = dayKey(today - (length - 1 - i) * DAY_MS);
    return { date, count: counts.get(date) ?? 0 };
  });
}

export const WEEK_DAYS = 7;

/** What was finished over the last `days` days, grouped, with the week's counts. */
export function history(ctx: Ctx, days: number): History {
  const now = ctx.now();
  const since = startOfDay(now) - (Math.max(days, WEEK_DAYS) - 1) * DAY_MS;
  const done = listDone(ctx, since);
  const sinceDays = startOfDay(now) - (days - 1) * DAY_MS;
  return { days: groupByDay(done.filter((t) => (t.completedAt ?? 0) >= sinceDays)), week: weekOf(done, now, WEEK_DAYS) };
}

export function doneToday(ctx: Ctx): number {
  const row = ctx.db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE status = 'done' AND completed_at >= ?").get(startOfDay(ctx.now())) as { n: number };
  return row.n;
}
