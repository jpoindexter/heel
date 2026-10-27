import { z } from "zod";

/* The person's apps (N26): Calendar, Reminders, Notes. The model proposes a write; the panel shows it; only the person's tap sends it. */

/** A local date: "YYYY-MM-DD" (all day) or "YYYY-MM-DDTHH:mm". */
export const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
const localDate = z.string().regex(LOCAL_DATE, 'a date like "2026-10-28" or "2026-10-28T10:00" (local time)');
export const APP_KINDS = ["event", "reminder", "note"] as const;
export type AppKind = (typeof APP_KINDS)[number];
export const AppWriteSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("event"), title: z.string().trim().min(1).max(200), start: localDate, end: localDate.optional(), location: z.string().max(200).optional(), notes: z.string().max(2000).optional() }),
  z.object({ kind: z.literal("reminder"), title: z.string().trim().min(1).max(200), due: localDate.optional(), notes: z.string().max(2000).optional() }),
  z.object({ kind: z.literal("note"), title: z.string().trim().min(1).max(200), body: z.string().min(1).max(20_000) }),
]);
export type AppWrite = z.output<typeof AppWriteSchema>;
export const AppWriteInputSchema = z.object({ write: AppWriteSchema });
/** What the app gave back: its id (for Undo) and the receipt line. */
export const APP_UNDO_KINDS = ["delete_event", "delete_reminder", "delete_note"] as const;
export const AppWrittenSchema = z.object({ id: z.string(), undo: z.object({ kind: z.enum(APP_UNDO_KINDS), id: z.string() }), message: z.string() });
export type AppWrittenDto = z.output<typeof AppWrittenSchema>;
export const AppRemoveInputSchema = z.object({ kind: z.enum(APP_KINDS), id: z.string().min(1) });
export const RemovedSchema = z.object({ removed: z.boolean() });
