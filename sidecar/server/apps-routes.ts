import type { Hono } from "hono";
import { AppRemoveInputSchema, AppWriteInputSchema, type AppKind } from "../../shared/api";
import { writtenText } from "../apps/preview";
import type { AppDeps } from "./app";
import { fail, ok, readJson } from "./respond";

const UNDO_KIND: Record<AppKind, "delete_event" | "delete_reminder" | "delete_note"> = { event: "delete_event", reminder: "delete_reminder", note: "delete_note" };

/**
 * The person's apps (N26). The model only proposes a write (it lands in a receipt as a preview); the panel calls
 * POST /apps/write when the person taps "Add to …", and POST /apps/remove is that write's Undo. Reading happens inside a turn.
 */
export function registerAppsRoutes(app: Hono, { apps }: AppDeps): void {
  app.post("/apps/write", async (c) => {
    const body = AppWriteInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", "Send {\"write\": {kind, title, ...}} with a local date like 2026-10-28T10:00.");
    const written = await apps.add(body.data.write);
    if (!written.ok) return fail(c, written.error.code, written.error.message);
    return ok(c, { id: written.value.id, undo: { kind: UNDO_KIND[body.data.write.kind], id: written.value.id }, message: writtenText(body.data.write, written.value.where) });
  });

  app.post("/apps/remove", async (c) => {
    const body = AppRemoveInputSchema.safeParse(await readJson(c));
    if (!body.success) return fail(c, "invalid", "Send {\"kind\": \"event\", \"id\": \"...\"}.");
    const removed = await apps.remove(body.data.kind, body.data.id);
    return removed.ok ? ok(c, { removed: true }) : fail(c, removed.error.code, removed.error.message);
  });
}
