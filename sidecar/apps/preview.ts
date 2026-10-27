import type { AppWrite, AppKind } from "../../shared/api";

/** A new event with no end lasts this long. */
export const DEFAULT_EVENT_MINUTES = 60;
const LOCALE = "en-GB";

export const APP_NAMES: Record<AppKind, string> = { event: "Calendar", reminder: "Reminders", note: "Notes" };

/** "2026-10-28" or "2026-10-28T10:00" (local time, as the model writes it) to a Date. */
export function parseLocal(text: string): Date {
  const [date, time] = text.split("T");
  const [y, m, d] = date!.split("-").map(Number);
  const [h, mi] = (time ?? "00:00").split(":").map(Number);
  return new Date(y!, m! - 1, d!, h!, mi!);
}

const day = (d: Date) => d.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric", month: "short" });
const clock = (d: Date) => d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", hour12: false });

/** When an event or reminder is, in plain words: "Tue 28 Oct 10:00–11:00", "Tue 28 Oct, all day", "Tue 28 Oct 09:00". */
export function whenText(start: string, end?: string): string {
  const from = parseLocal(start);
  if (!start.includes("T")) return `${day(from)}, all day`;
  const to = end ? parseLocal(end) : new Date(from.getTime() + DEFAULT_EVENT_MINUTES * 60_000);
  const sameDay = from.toDateString() === to.toDateString();
  return `${day(from)} ${clock(from)}–${sameDay ? "" : `${day(to)} `}${clock(to)}`;
}

/** The preview the person reads before tapping, and the receipt after. The same words both times, so nothing changes under them. */
export function describeWrite(write: AppWrite): string {
  switch (write.kind) {
    case "event":
      return `"${write.title.trim()}" — ${whenText(write.start, write.end)}${write.location?.trim() ? `, ${write.location.trim()}` : ""}`;
    case "reminder":
      return `"${write.title.trim()}"${write.due ? ` — due ${whenText(write.due).replace(/–.*$/, "")}` : ", no date"}`;
    case "note":
      return `"${write.title.trim()}" — ${write.body.trim().split(/\s+/).length} words`;
  }
}

/** The receipt line while the write waits for the person's tap. */
export const proposalText = (write: AppWrite): string => `Add to ${APP_NAMES[write.kind]}? ${describeWrite(write)}`;

/** The receipt line once the app has it. */
export const writtenText = (write: AppWrite, where: string): string => `Added to ${APP_NAMES[write.kind]} (${where}): ${describeWrite(write)}`;

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Notes wants HTML, one div per line. The title goes in the note's `name`: Notes shows it as the first line itself. */
export function noteHtml(body: string): string {
  const lines = body.split("\n").map((line) => `<div>${escapeHtml(line) || "<br>"}</div>`);
  return lines.join("");
}
