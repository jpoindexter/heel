import { useState } from "react";
import { Button, Flex, Heading, SegmentedControl, Switch, Text, TextArea, TextField } from "@radix-ui/themes";
import { FEEDBACK_TO, isFeedbackKind, type FeedbackKind } from "../../shared/feedback";
import { client } from "../api/default-client";
import { FEEDBACK_WORDS } from "../ui/feedback-mail";
import { useFeedback } from "./useFeedback";

const TITLE_MAX = 120;
const TEXT_MAX = 3_000;

/** For testers: a bug or an idea, written here, sent from their own mail app to Jason. Heel never sends it. */
export function FeedbackSettings() {
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [title, setTitle] = useState("");
  const [what, setWhat] = useState("");
  const [more, setMore] = useState("");
  const [withReport, setWithReport] = useState(true);
  const { busy, said, fallback, send, copyFallback } = useFeedback(client);
  const words = FEEDBACK_WORDS[kind];
  const ready = title.trim() !== "" && what.trim() !== "";
  const submit = async () => {
    if (!ready || !(await send({ kind, title, what, more, withReport }))) return;
    setTitle("");
    setWhat("");
    setMore("");
  };
  return (
    <section aria-labelledby="feedback-heading" className="settings-section">
      <Heading as="h3" id="feedback-heading" size="2">Send feedback</Heading>
      <Text as="p" size="1" color="gray" id="feedback-help">Goes to {FEEDBACK_TO}. Heel opens an email in your mail app; nothing is sent until you press Send there.</Text>
      <form className="settings-section" aria-describedby="feedback-help" onSubmit={(event) => (event.preventDefault(), void submit())}>
        <SegmentedControl.Root size="1" value={kind} onValueChange={(value) => isFeedbackKind(value) && setKind(value)} aria-label="Kind of feedback">
          <SegmentedControl.Item value="bug">Something broke</SegmentedControl.Item>
          <SegmentedControl.Item value="idea">An idea</SegmentedControl.Item>
        </SegmentedControl.Root>
        <div className="field">
          <Text as="label" size="2" weight="medium" htmlFor="feedback-title">In one line</Text>
          <TextField.Root id="feedback-title" size="1" value={title} maxLength={TITLE_MAX} required onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="field">
          <Text as="label" size="2" weight="medium" htmlFor="feedback-what">{words.what}</Text>
          <TextArea id="feedback-what" size="1" rows={4} value={what} maxLength={TEXT_MAX} required onChange={(event) => setWhat(event.target.value)} />
        </div>
        <div className="field">
          <Text as="label" size="2" weight="medium" htmlFor="feedback-more">{words.more} <Text color="gray" weight="regular">(optional)</Text></Text>
          <TextArea id="feedback-more" size="1" rows={2} value={more} maxLength={TEXT_MAX} onChange={(event) => setMore(event.target.value)} />
        </div>
        <Text as="label" size="2">
          <Switch size="1" checked={withReport} onCheckedChange={setWithReport} /> Include the debug report (version, Mac, logs; never your tasks, messages or mail)
        </Text>
        <Flex gap="2" wrap="wrap">
          <Button type="submit" size="2" radius="full" disabled={!ready} loading={busy}>Write the email…</Button>
          {fallback !== null && <Button type="button" size="2" radius="full" variant="soft" onClick={() => void copyFallback()}>Copy email</Button>}
        </Flex>
      </form>
      {said && <Text as="p" size="1" color="gray" role="status">{said}</Text>}
    </section>
  );
}
