import { useCallback, useEffect, useState } from "react";
import { DocumentResultSchema, DocumentsListSchema, OpenedSchema, type DocumentDto, type DocumentFile } from "../../shared/api";
import type { Client } from "../api/client";

type Options = { active: boolean; notify: (message: string, tone?: "info" | "error", undo?: () => void) => void };

/** Documents Heel wrote (N15): the list while its surface shows, open / reveal on this Mac, delete with Undo. */
export function useDocuments(client: Client, { active, notify }: Options) {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);

  const load = useCallback(async () => {
    const result = await client.get("/documents", DocumentsListSchema);
    if (result.ok) setDocuments(result.data.documents);
  }, [client]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const open = useCallback(
    async (id: string, { reveal = false, file = "md" }: { reveal?: boolean; file?: DocumentFile } = {}) => {
      const result = await client.post(`/documents/${id}/${reveal ? "reveal" : "open"}?file=${file}`, OpenedSchema, {});
      if (!result.ok) notify(result.error.message, "error");
    },
    [client, notify],
  );

  /** Make the PDF (or remake it) and open it; the list then shows it has one. */
  const pdf = useCallback(
    async (doc: DocumentDto) => {
      notify(`Making a PDF of “${doc.title}”…`);
      const result = await client.post(`/documents/${doc.id}/pdf`, DocumentResultSchema, {});
      if (!result.ok) return notify(result.error.message, "error");
      await load();
    },
    [client, load, notify],
  );

  const remove = useCallback(
    async (doc: DocumentDto) => {
      const result = await client.post(`/documents/${doc.id}/delete`, DocumentResultSchema, {});
      if (!result.ok) return notify(result.error.message, "error");
      await load();
      notify(`Removed “${doc.title}” from the list (the file stays)`, "info", () => void client.post(`/documents/${doc.id}/restore`, DocumentResultSchema, {}).then(load));
    },
    [client, load, notify],
  );

  return { documents, load, open, pdf, remove };
}
