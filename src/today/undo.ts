import { DocumentResultSchema, TaskResultSchema, UnparkResultSchema, type ApiResult, type UndoDto } from "../../shared/api";
import type { Client } from "../api/client";

const ROUTES: Record<UndoDto["kind"], (id: string) => string> = {
  restore_task: (id) => `/tasks/${id}/restore`,
  drop_task: (id) => `/tasks/${id}/drop`,
  unpark: (id) => `/parked/${id}/unpark`,
  delete_document: (id) => `/documents/${id}/delete`,
};

/** Reverse one write Heel made. Each kind maps to exactly one helper route. */
export function runUndo(client: Client, undo: UndoDto): Promise<ApiResult<unknown>> {
  const schema = undo.kind === "unpark" ? UnparkResultSchema : undo.kind === "delete_document" ? DocumentResultSchema : TaskResultSchema;
  return client.post(ROUTES[undo.kind](undo.id), schema);
}
