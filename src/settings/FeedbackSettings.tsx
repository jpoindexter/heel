import { useState } from "react";
import { Button, Flex, SegmentedControl, Text, TextArea, TextField } from "@radix-ui/themes";
import { FEEDBACK_TO, FEEDBACK_WORDS, isFeedbackKind } from "../../shared/feedback";
import type { Diagnostics } from "../../shared/reports";
import { client } from "../api/default-client";
import { reportDiagnostics } from "../ui/report-diagnostics";
import { ReportDialog } from "../ui/ReportDialog";
import { DiagnosticChoices, chosenDiagnostics } from "../ui/DiagnosticChoices";
import { useFeedback } from "./useFeedback";

export function FeedbackSettings() {
  const { draft, change, busy, said, send } = useFeedback(client);
  const { kind, title, what, more, withReport, withEvents } = draft;
  const [preview, setPreview] = useState<Diagnostics | null>(null);
  const locked = busy || !!draft.pending;
  const ready = title.trim() !== "" && what.trim() !== "";
  const words = FEEDBACK_WORDS[kind];
  return <ReportDialog title="Send feedback" trigger="Send feedback"><section className="settings-section">
    <Text as="p" size="1" color="gray" id="feedback-help">Send directly to Heel’s private feedback inbox and notify {FEEDBACK_TO}. No mail app is needed.</Text>
    <form className="settings-section" aria-describedby="feedback-help" onSubmit={event => { event.preventDefault(); if (ready) void send(preview ?? undefined); }}>
      <SegmentedControl.Root disabled={locked} size="1" value={kind} onValueChange={value => { if (isFeedbackKind(value)) change({ kind: value }); }} aria-label="Kind of feedback">
        <SegmentedControl.Item value="bug">Something broke</SegmentedControl.Item><SegmentedControl.Item value="idea">An idea</SegmentedControl.Item>
      </SegmentedControl.Root>
      <div className="field"><Text as="label" size="2" weight="medium" htmlFor="feedback-title">In one line</Text>
        <TextField.Root id="feedback-title" size="1" value={title} maxLength={120} required disabled={locked} onChange={event => change({ title: event.target.value })} />
      </div>
      <div className="field"><Text as="label" size="2" weight="medium" htmlFor="feedback-what">{words.what}</Text>
        <TextArea id="feedback-what" size="1" rows={4} value={what} maxLength={3000} required disabled={locked} onChange={event => change({ what: event.target.value })} />
      </div>
      <div className="field"><Text as="label" size="2" weight="medium" htmlFor="feedback-more">{words.more} (optional)</Text>
        <TextArea id="feedback-more" size="1" rows={2} value={more} maxLength={3000} disabled={locked} onChange={event => change({ more: event.target.value })} />
      </div>
      <DiagnosticChoices facts={withReport} events={withEvents} disabled={locked} onChange={(withReport, withEvents) => change({ withReport, withEvents })} />
      <Flex gap="2" wrap="wrap">
        <Button type="submit" size="2" radius="full" disabled={!ready || busy} loading={busy}>{draft.pending ? "Retry report" : "Send report"}</Button>
        <Button type="button" size="1" variant="soft" onClick={() => void reportDiagnostics(client).then(setPreview)}>Preview debug details</Button>
      </Flex>
    </form>
    {preview && <pre className="debug-log" tabIndex={0} aria-label="Debug details preview">{JSON.stringify(draft.pending ? draft.pending.diagnostics : chosenDiagnostics(preview, withReport, withEvents), null, 2)}</pre>}
    {said && <Text as="p" size="1" color="gray" role="status">{said}</Text>}
  </section></ReportDialog>;
}
