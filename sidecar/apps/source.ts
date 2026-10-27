import { z } from "zod";
import type { AppKind, AppWrite } from "../../shared/api";
import type { Outcome } from "../inbox/service";
import type { JxaRunner } from "../mail/jxa";
import { APP_NAMES, DEFAULT_EVENT_MINUTES, noteHtml } from "./preview";
import { EVENTS, NOTES, REMINDERS } from "./scripts";

/** How far ahead the calendar is read, and how many of each the model sees. */
export const EVENT_DAYS = 7;
const NOTE_DAYS = 30;
const MAX_ITEMS = 15;
const REMINDER_NOTE_CHARS = 120;
/** Calendar answers a 7-day query in 20–45 s on a big calendar (one Apple Event per event), so a read is kept this long. */
export const CALENDAR_CACHE_MS = 10 * 60_000;
/** Mirrors of other apps' data: not worth 1–7 s each. */
const SKIPPED_CALENDARS = ["Siri Suggestions", "Scheduled Reminders"];

export type EventItem = { id: string; title: string; start: string; end: string; allDay: boolean; calendar: string; location: string };
export type ReminderItem = { id: string; title: string; due: string | null; list: string; notes: string };
export type NoteItem = { id: string; title: string; modified: string };

const EventsListed = z.object({ items: z.array(z.object({ id: z.string(), title: z.string(), start: z.string(), end: z.string(), allDay: z.boolean(), calendar: z.string(), location: z.string() })) });
const RemindersListed = z.object({ items: z.array(z.object({ id: z.string(), title: z.string(), due: z.string().nullable(), list: z.string(), notes: z.string() })) });
const NotesListed = z.object({ items: z.array(z.object({ id: z.string(), title: z.string(), modified: z.string() })) });
const Added = z.union([z.object({ ok: z.literal(true), id: z.string(), where: z.string() }), z.object({ ok: z.literal(false), error: z.string() })]);
const Removed = z.union([z.object({ ok: z.literal(true) }), z.object({ ok: z.literal(false), error: z.string() })]);

/** Reading the person's apps: nothing changes. */
export type AppsRead = {
  events(now: number): Promise<Outcome<EventItem[]>>;
  reminders(): Promise<Outcome<ReminderItem[]>>;
  notes(): Promise<Outcome<NoteItem[]>>;
};

/** Writing: only after the person tapped the preview. `remove` is Undo for `add`. */
export type AppsSource = AppsRead & {
  add(write: AppWrite): Promise<Outcome<{ id: string; where: string }>>;
  remove(kind: AppKind, id: string): Promise<Outcome<true>>;
};

const fail = (code: string, message: string): Outcome<never> => ({ ok: false, error: { code, message } });
const SCRIPTS: Record<AppKind, string> = { event: EVENTS, reminder: REMINDERS, note: NOTES };

function parsed<T extends z.ZodType>(result: Outcome<unknown>, schema: T, app: string): Outcome<z.output<T>> {
  if (!result.ok) return result;
  const value = schema.safeParse(result.value);
  return value.success ? { ok: true, value: value.data } : fail("app_failed", `${app} answered in a way Heel couldn't read.`);
}

/** The three apps through osascript, one runner per app (each names its app in the "not allowed" sentence). */
export function appleApps(jxa: (app: string) => JxaRunner): AppsSource {
  const run = (kind: AppKind, input: Record<string, unknown>) => jxa(APP_NAMES[kind])(SCRIPTS[kind], input);
  let calendar: { at: number; value: Outcome<EventItem[]> } | null = null;

  const list = async (kind: AppKind, input: Record<string, unknown>) => {
    const schema = kind === "event" ? EventsListed : kind === "reminder" ? RemindersListed : NotesListed;
    const result = parsed(await run(kind, { op: "list", ...input }), schema, APP_NAMES[kind]);
    return result.ok ? { ok: true as const, value: result.value.items } : result;
  };

  return {
    async events(now) {
      if (calendar && now - calendar.at < CALENDAR_CACHE_MS && calendar.value.ok) return calendar.value;
      const value = (await list("event", { fromMs: now, days: EVENT_DAYS, limit: MAX_ITEMS, skip: SKIPPED_CALENDARS })) as Outcome<EventItem[]>;
      calendar = { at: now, value };
      return value;
    },
    reminders: () => list("reminder", { limit: MAX_ITEMS, previewChars: REMINDER_NOTE_CHARS }) as Promise<Outcome<ReminderItem[]>>,
    notes: () => list("note", { days: NOTE_DAYS, limit: MAX_ITEMS }) as Promise<Outcome<NoteItem[]>>,

    async add(write) {
      const input = write.kind === "note" ? { title: write.title, html: noteHtml(write.body) } : write.kind === "event" ? { ...write, defaultMinutes: DEFAULT_EVENT_MINUTES } : write;
      const result = parsed(await run(write.kind, { op: "add", ...input }), Added, APP_NAMES[write.kind]);
      if (!result.ok) return result;
      if (!result.value.ok) return fail("app_failed", `${APP_NAMES[write.kind]} didn't take it (${result.value.error}).`);
      if (write.kind === "event") calendar = null;
      return { ok: true, value: { id: result.value.id, where: result.value.where } };
    },

    async remove(kind, id) {
      const result = parsed(await run(kind, { op: "remove", id }), Removed, APP_NAMES[kind]);
      if (!result.ok) return result;
      if (kind === "event") calendar = null;
      return result.value.ok ? { ok: true, value: true } : fail("not_found", `That's not in ${APP_NAMES[kind]} any more.`);
    },
  };
}

/** For tests: fixed lists, and a record of every write. */
export function fakeApps(items: { events?: EventItem[]; reminders?: ReminderItem[]; notes?: NoteItem[] } = {}): AppsSource & { added: AppWrite[]; removed: [AppKind, string][] } {
  const added: AppWrite[] = [];
  const removed: [AppKind, string][] = [];
  return {
    added,
    removed,
    events: async () => ({ ok: true, value: items.events ?? [] }),
    reminders: async () => ({ ok: true, value: items.reminders ?? [] }),
    notes: async () => ({ ok: true, value: items.notes ?? [] }),
    add: async (write) => (added.push(write), { ok: true, value: { id: `${write.kind}-${added.length}`, where: "Test" } }),
    remove: async (kind, id) => (removed.push([kind, id]), { ok: true, value: true }),
  };
}
