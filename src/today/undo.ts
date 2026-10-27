import { DocumentResultSchema, RemovedSchema, TaskResultSchema, UnparkResultSchema, type ApiResult, type UndoDto } from "../../shared/api";
import type { Client } from "../api/client";

const ROUTES: Record<UndoDto["kind"], (id: string) => string> = {
  restore_task: (id) => `/tasks/${id}/restore`,
  drop_task: (id) => `/tasks/${id}/drop`,
  unpark: (id) => `/parked/${id}/unpark`,
  delete_document: (id) => `/documents/${id}/delete`,
  delete_event: () => "/apps/remove",
  delete_reminder: () => "/apps/remove",
  delete_note: () => "/apps/remove",
};

/** App ids hold slashes (x-coredata://…), so a removal names the kind in the body, not the path. */
const APP_KIND: Partial<Record<UndoDto["kind"], "event" | "reminder" | "note">> = { delete_event: "event", delete_reminder: "reminder", delete_note: "note" };

/** Reverse one write Heel made. Each kind maps to exactly one helper route. */
export function runUndo(client: Client, undo: UndoDto): Promise<ApiResult<unknown>> {
  const kind = APP_KIND[undo.kind];
  if (kind) return client.post(ROUTES[undo.kind](undo.id), RemovedSchema, { kind, id: undo.id });
  const schema = undo.kind === "unpark" ? UnparkResultSchema : undo.kind === "delete_document" ? DocumentResultSchema : TaskResultSchema;
  return client.post(ROUTES[undo.kind](undo.id), schema);
}
