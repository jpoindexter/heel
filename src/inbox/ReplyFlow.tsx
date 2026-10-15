import { useState, type FormEvent } from "react";
import { Button, Callout, Text, TextArea, TextField } from "@radix-ui/themes";
import { VisuallyHidden } from "radix-ui";
import { MAX_INSTRUCTION, instructionFromInput, recipientName } from "./reply-model";
import type { useReplyFlow } from "./useMail";

type Flow = ReturnType<typeof useReplyFlow>;

function Ask({ flow }: { flow: Flow }) {
  const [typed, setTyped] = useState("");
  if (flow.state.phase !== "asking" && flow.state.phase !== "error") return null;
  const { item } = flow.state;
  const instruction = instructionFromInput(typed);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (instruction) void flow.draft(item, instruction);
  };
  return (
    <form className="reply-ask pop" onSubmit={submit}>
      {flow.state.phase === "error" && (
        <Callout.Root color="amber" size="1" role="alert" highContrast><Callout.Text>{flow.state.message}</Callout.Text></Callout.Root>
      )}
      <VisuallyHidden.Root asChild><label htmlFor="reply-instruction">What do you want to say to {recipientName(item.from)}?</label></VisuallyHidden.Root>
      <TextField.Root id="reply-instruction" size="2" maxLength={MAX_INSTRUCTION} autoFocus placeholder={`What do you want to say to ${recipientName(item.from)}?`} value={typed} onChange={(e) => setTyped(e.target.value)} />
      <div className="inbox-actions">
        <Button type="submit" size="1" radius="full" highContrast disabled={!instruction}>Draft it</Button>
        <Button type="button" size="1" radius="full" variant="soft" color="gray" onClick={flow.cancel}>Not now</Button>
      </div>
    </form>
  );
}

function Preview({ flow }: { flow: Flow }) {
  if (flow.state.phase !== "preview" && flow.state.phase !== "sending") return null;
  const { item, body } = flow.state;
  const sending = flow.state.phase === "sending";
  return (
    <section className="reply-preview pop" role="region" aria-label="Reply preview">
      <Text size="1" color="gray" className="clamp-1">To {recipientName(item.from)} · Re: {item.subject}</Text>
      <VisuallyHidden.Root asChild><label htmlFor="reply-body">The reply, as it will be sent</label></VisuallyHidden.Root>
      <TextArea id="reply-body" size="2" rows={4} resize="vertical" value={body} disabled={sending} onChange={(e) => flow.setBody(e.target.value)} />
      <Text size="1" color="gray">Nothing goes out until you press Send. Sending can't be undone.</Text>
      <div className="inbox-actions">
        <Button size="1" radius="full" highContrast disabled={sending || body.trim().length === 0} onClick={() => void flow.send()}>{sending ? "Sending…" : "Send"}</Button>
        <Button size="1" radius="full" variant="soft" color="gray" disabled={sending} onClick={() => void flow.openInMail()}>Open in Mail</Button>
        <Button size="1" radius="full" variant="ghost" color="gray" disabled={sending} onClick={flow.cancel}>Not now</Button>
      </div>
    </section>
  );
}

/** The three steps of a reply, one at a time, under the email it belongs to. */
export function ReplyFlow({ flow }: { flow: Flow }) {
  if (flow.state.phase === "idle") return null;
  if (flow.state.phase === "drafting") return <Text size="2" color="gray" role="status" className="pulse">Drafting a reply to {recipientName(flow.state.item.from)}…</Text>;
  return (
    <>
      <Ask flow={flow} />
      <Preview flow={flow} />
    </>
  );
}
