import { useEffect, useState } from "react";
import { Button, Text } from "@radix-ui/themes";
import { useApplications } from "./useApplications";
import { ApplicationFields } from "./ApplicationFields";
import { RequestReview } from "./RequestReview";
import { ApplicationControls } from "./ApplicationControls";
import { BrowserAssist } from "./BrowserAssist";
import { ObservedConfirmation } from "./ObservedConfirmation";
import "./applications.css";

export function ApplicationsPanel() {
  const { application: app, problem, busy: working, run, refresh, upload } = useApplications();
  const [visualBusy, setVisualBusy] = useState(false);
  const busy = working || visualBusy;
  const [url, setUrl] = useState("");
  const [facts, setFacts] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => { setFacts(app?.facts ?? ""); setValues({}); }, [app?.id]);
  useEffect(() => { if (app?.facts) setFacts(app.facts); }, [app?.facts]);
  useEffect(() => { setValues({}); }, [app?.review]);
  const dirty = Object.keys(values).length > 0;
  const active = app?.status === "review";
  useEffect(() => {
    if (!active || busy || dirty) return;
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => window.clearInterval(timer);
  }, [active, busy, dirty, refresh]);
  return <section className="applications" aria-label="Job applications" aria-busy={busy}>
    <Text as="p" size="2">Fill the form, review every answer, then approve each outgoing site request.</Text>
    {problem && <Text as="p" color="amber" role="alert">{problem}</Text>}
    {!active && <form onSubmit={e => { e.preventDefault(); void run("open", { url, facts }); }}>
      <label>Job application URL<input type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /></label>
      <Button disabled={busy} type="submit">Open application</Button>
    </form>}
    {app && <>
      <Text as="p" weight="bold">{app.title}</Text>
      <Text as="p" size="1" className="application-url">{app.url}</Text>
      <Text as="p" size="2" role="status">{busy ? "Working on the application…" : app.message}</Text>
      {app.confirmation && <Text as="p" weight="bold">{app.confirmation}</Text>}
      {app.status === "uncertain" && <ObservedConfirmation busy={busy} onShow={() => void run("show")} onConfirm={quote => void run("confirm-observed", { quote, accepted: true })} />}
      {active && <>
        <div className="row"><Button disabled={busy} size="1" variant="soft" onClick={() => void run("show")}>Show browser</Button><Button disabled={busy || dirty} size="1" variant="soft" onClick={() => void refresh()}>Refresh form</Button></div>
        <Text as="p" size="1" color="gray">Sign in or complete human verification in the browser, then refresh. Cancel stops waiting requests.</Text>
        <label>Applicant facts and answers<textarea rows={5} value={facts} maxLength={20_000} disabled={busy} onChange={e => setFacts(e.target.value)} placeholder="Name, email, experience and answers you want Heel to use. Unknown answers stay blank." /></label>
        <label>Add a CV or supporting document<input type="file" accept=".pdf,.doc,.docx,.txt" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(null, file); }} /></label>
        <Text as="p" size="1" color="gray">Fill sends your facts and page content to your AI, including a screenshot when needed. Site requests wait for Allow once.</Text>
        <Button disabled={busy || !facts.trim() || !!app.pending.length} variant="soft" onClick={() => void run("fill", { facts })}>Fill from my facts</Button>
        <BrowserAssist facts={facts} disabled={busy || dirty || !!app.pending.length} onBusy={setVisualBusy} onChanged={refresh} />
        <ApplicationFields fields={app.fields} values={values} disabled={busy || !!app.pending.length} onChange={(id, value) => setValues(v => ({ ...v, [id]: value }))} onFile={(id, file) => void upload(id, file)} />
        {dirty && <Button disabled={busy} onClick={() => void run("edit", { values: Object.entries(values).map(([id, value]) => ({ id, value })) })}>Save corrections to form</Button>}
        {app.attachments.map(a => <div key={a.id}><Text as="p" size="1">Attachment: {a.name} · {a.bytes} bytes</Text><Button size="1" variant="soft" disabled={busy || !!app.pending.length} onClick={() => void run("read-cv", { attachment: a.id, facts })}>Use {a.name} as facts</Button></div>)}
        {app.pending.map(request => <RequestReview key={request.id} request={request} busy={busy || dirty || !app.review} onApprove={() => void run("approve", { request: request.id, review: app.review })} onDeny={() => void run("cancel")} />)}
        {!app.pending.length && <ApplicationControls key={app.url} application={app} disabled={busy || dirty} onReview={input => void run("stage", input)} />}
        <Button variant="ghost" color="gray" onClick={() => void run("cancel")}>Cancel application</Button>
      </>}
    </>}
  </section>;
}
