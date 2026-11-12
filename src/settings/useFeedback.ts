import { useCallback, useEffect, useRef, useState } from "react";
import type { Client } from "../api/client";
import { reportDiagnostics } from "../ui/report-diagnostics";
import { sendReport, receiptMessage } from "../ui/send-report";
import { chosenDiagnostics } from "../ui/DiagnosticChoices";
import { blankFeedback, keepFeedbackDraft, readFeedbackDraft, type FeedbackForm } from "./feedback-draft";
import type { Diagnostics } from "../../shared/reports";

export function useFeedback(client: Client) {
  const [draft, setDraft] = useState(readFeedbackDraft);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => { keepFeedbackDraft(draft); }, [draft]);
  const change = (patch: Partial<FeedbackForm>) => { if (!draft.pending) setDraft(current => ({ ...current, ...patch })); };
  const send = useCallback(async (preview?: Diagnostics) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setSaid(null);
    try {
      const report = draft.pending ?? { id: crypto.randomUUID(), kind: draft.kind, title: draft.title, what: draft.what, more: draft.more, diagnostics: chosenDiagnostics(draft.withReport ? preview ?? await reportDiagnostics(client) : null, draft.withReport, draft.withEvents) };
      const pending = { ...draft, pending: report };
      if (!keepFeedbackDraft(pending)) { setSaid("Could not keep a retry copy on this Mac. Nothing was sent; copy your text before trying again."); return; }
      setDraft(pending);
      const result = await sendReport(report);
      if (!result.ok) { setSaid(result.message); return; }
      const next = blankFeedback(); keepFeedbackDraft(next); setDraft(next); setSaid(receiptMessage(result.data));
    } catch { setSaid("The report could not be prepared. Your text is kept; try again."); }
    finally { lock.current = false; setBusy(false); }
  }, [client, draft]);
  return { draft, change, send, busy, said };
}
