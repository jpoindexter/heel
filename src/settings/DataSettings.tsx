import { useId, useState } from "react";
import { Button, Text, TextField } from "@radix-ui/themes";
import { WIPE_PHRASE } from "../../shared/data";
import { client } from "../api/default-client";
import { confirmsWipe, wipeLines } from "./data-model";
import { useDataActions } from "./useDataActions";

/** Privacy & data (N4): where it lives, a backup, and the wipe: preview with real counts, then the phrase typed by hand. */
export function DataSettings() {
  const { preview, said, busy, backup, startWipe, cancelWipe, wipe } = useDataActions(client);
  const [typed, setTyped] = useState("");
  const fieldId = useId();
  const ready = confirmsWipe(typed);
  return (
    <section aria-label="Privacy & data" className="settings-section">
      <Text as="p" size="1" color="gray">Everything Heel keeps is in one folder on this Mac (the path is under About). Conversations are dropped after 30 days; tasks, parked ideas and documents stay until you remove them.</Text>
      <div className="skill-actions">
        <Button size="1" variant="soft" radius="full" loading={busy && !preview} onClick={() => void backup()}>Back up to Desktop…</Button>
        {!preview && <Button size="1" variant="soft" color="red" radius="full" onClick={() => void startWipe()}>Wipe everything…</Button>}
      </div>
      {preview && (
        <div className="danger-zone" role="group" aria-labelledby="wipe-heading">
          <Text as="p" id="wipe-heading" size="2" weight="medium">Wipe everything?</Text>
          {wipeLines(preview).map((line) => (
            <Text as="p" key={line} size="1" color="gray">{line}</Text>
          ))}
          <div className="field">
            <Text as="label" size="1" weight="medium" htmlFor={fieldId}>Type “{WIPE_PHRASE}” to confirm</Text>
            <TextField.Root id={fieldId} size="1" value={typed} autoComplete="off" spellCheck={false} onChange={(event) => setTyped(event.target.value)} />
          </div>
          <div className="skill-actions">
            <Button size="1" variant="soft" radius="full" autoFocus onClick={() => (cancelWipe(), setTyped(""))}>Keep everything</Button>
            <Button size="1" color="red" radius="full" disabled={!ready} loading={busy} onClick={() => void wipe(typed.trim())}>Wipe everything</Button>
          </div>
        </div>
      )}
      {said && <Text as="p" size="1" color="gray" role="status">{said}</Text>}
    </section>
  );
}
