import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ApplicationStateSchema, AttachmentSchema, MAX_ATTACHMENT_BYTES, type ApplicationView } from "../../shared/applications";
import { client } from "../api/default-client";

export function useApplications() {
  const [application, setApplication] = useState<ApplicationView | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inflight = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    const result = await client.get("/applications", ApplicationStateSchema);
    if (result.ok) { setApplication(result.data.application); setProblem(result.data.problem ?? null); }
    else setProblem(result.error.message);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const run = async (action: string, body: unknown = {}) => {
    if (action === "cancel") inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setBusy(true); setProblem(null);
    try {
      const result = await client.post(`/applications/${action}`, ApplicationStateSchema, body, controller.signal);
      if (controller.signal.aborted) return;
      if (result.ok) setApplication(result.data.application);
      else { setProblem(result.error.message); await refreshAfterFailure(); }
    } finally { if (inflight.current === controller) { inflight.current = null; setBusy(false); } }
  };
  const refreshAfterFailure = async () => {
    const result = await client.get("/applications", ApplicationStateSchema);
    if (result.ok) setApplication(result.data.application);
  };
  const upload = async (field: string | null, file: File) => {
    if (!file.size || file.size > MAX_ATTACHMENT_BYTES) return setProblem("Choose a non-empty CV up to 5 MB.");
    setBusy(true); setProblem(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("The CV could not be read."));
        reader.readAsDataURL(file);
      });
      const uploaded = await client.post("/applications/upload", z.object({ attachment: AttachmentSchema }), { name: file.name, base64 });
      if (!uploaded.ok) return setProblem(uploaded.error.message);
      if (field) await run("attach", { field, attachment: uploaded.data.attachment.id });
      else await refresh();
    } catch (error) { setProblem(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  return { application, problem, busy, run, refresh, upload };
}
