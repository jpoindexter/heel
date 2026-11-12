import { useRef, useState } from "react";
import { Button, Text } from "@radix-ui/themes";
import { FeedbackReportSchema, type FeedbackReport, type Diagnostics } from "../../shared/reports";
import { client } from "../api/default-client";
import { reportDiagnostics } from "./report-diagnostics";
import { sendReport, receiptMessage } from "./send-report";
import { ReportDialog } from "./ReportDialog";
import { DiagnosticChoices, chosenDiagnostics } from "./DiagnosticChoices";

function kept(key: string): FeedbackReport | null {
  try { return FeedbackReportSchema.parse(JSON.parse(localStorage.getItem(key) ?? "null")); }
  catch { return null; }
}

export function SendDiagnosticReport({ kind = "debug", open, onOpenChange }: { kind?: "debug" | "crash"; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const key = `heel:report-pending:${kind}`;
  const [report, setReport] = useState(() => kept(key));
  const [preview, setPreview] = useState<Diagnostics | null>(null);
  const [facts, setFacts] = useState(true), [events, setEvents] = useState(false);
  const [busy, setBusy] = useState(false), [said, setSaid] = useState<string | null>(null);
  const lock = useRef(false), name = kind === "crash" ? "crash" : "debug";
  const prepare = async () => {
    setBusy(true); setSaid(null);
    try { setPreview(await reportDiagnostics(client, kind === "crash")); }
    catch { setSaid("Could not prepare debug details. You can still copy the local report."); }
    finally { setBusy(false); }
  };
  const send = async () => {
    if (lock.current || (!report && !preview)) return;
    lock.current = true; setBusy(true); setSaid(null);
    try {
      const payload = report ?? { id: crypto.randomUUID(), kind, title: kind === "crash" ? "Heel session failed" : "Heel debug report", what: "Sent from Heel’s in-app diagnostics.", more: "", diagnostics: chosenDiagnostics(preview, facts, events) };
      localStorage.setItem(key, JSON.stringify(payload)); setReport(payload);
      const result = await sendReport(payload);
      if (result.ok) {
        try { localStorage.removeItem(key); } catch { /* a retained retry still deduplicates */ }
        setReport(null); setPreview(null); setSaid(receiptMessage(result.data));
      } else setSaid(result.message);
    } catch { setSaid("Could not keep a retry copy. Nothing was sent; copy the local report instead."); }
    finally { lock.current = false; setBusy(false); }
  };
  return <ReportDialog title={`Send ${name} report`} trigger={open === undefined ? `Report ${name === "crash" ? "a crash" : "a problem"}` : undefined} open={open} onOpenChange={onOpenChange}>
    <div className="settings-section">
      <Text as="p" size="2">Review what to share after a problem. Nothing is sent until you choose Send.</Text>
      <DiagnosticChoices facts={report ? !!report.diagnostics : facts} events={report ? !!report.diagnostics?.events.length : events} disabled={busy || !!report} onChange={(facts, events) => { setFacts(facts); setEvents(events); }} />
      {!preview && !report && <Button size="1" variant="soft" disabled={busy} onClick={() => void prepare()}>Review {name} report</Button>}
      {(preview || report) && <><pre className="debug-log" tabIndex={0} aria-label="Report preview">{JSON.stringify(report ? report.diagnostics : chosenDiagnostics(preview, facts, events), null, 2)}</pre><Button size="1" disabled={busy} loading={busy} onClick={() => void send()}>{report ? "Retry report" : `Send ${name} report`}</Button></>}
      {said && <Text as="p" size="1" role="status">{said}</Text>}
    </div>
  </ReportDialog>;
}
