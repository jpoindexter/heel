import { useState } from "react";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import type { BrainStateDto } from "../../shared/api";
import { KEYED_PROVIDER_IDS, type KeyedProviderId } from "../../shared/providers";

/** The helper's own floor for a key; anything shorter is a paste gone wrong. */
const MIN_KEY_CHARS = 8;

type Props = {
  state: BrainStateDto;
  /** Resolves with an error sentence, or null when the key was kept. */
  onSave: (provider: KeyedProviderId, key: string) => Promise<string | null>;
  onForget: (provider: KeyedProviderId) => void;
};

function KeyField({ id, label, ready, onSave, onForget }: { id: KeyedProviderId; label: string; ready: boolean; onSave: Props["onSave"]; onForget: Props["onForget"] }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const fieldId = `${id}-key`;
  const save = async () => {
    setSaving(true);
    const failed = await onSave(id, draft.trim());
    setSaving(false);
    setProblem(failed);
    if (!failed) setDraft("");
  };
  if (ready) {
    return (
      <Flex align="center" justify="between" gap="2" wrap="wrap">
        <Text size="2">{label}: key in your Keychain.</Text>
        <Button type="button" size="1" variant="ghost" color="gray" onClick={() => onForget(id)}>Forget key</Button>
      </Flex>
    );
  }
  return (
    <form className="field" onSubmit={(event) => (event.preventDefault(), void save())}>
      <Text as="label" size="2" weight="medium" htmlFor={fieldId}>{label}</Text>
      <Flex gap="2">
        <TextField.Root id={fieldId} type="password" value={draft} autoComplete="off" spellCheck={false} aria-describedby={`${fieldId}-help`} style={{ flex: 1 }} onChange={(event) => setDraft(event.target.value)} />
        <Button type="submit" size="2" variant="soft" loading={saving} disabled={draft.trim().length < MIN_KEY_CHARS}>Save key</Button>
      </Flex>
      <Text as="p" id={`${fieldId}-help`} size="1" color={problem ? "amber" : "gray"} role={problem ? "alert" : undefined}>
        {problem ?? "Checked with the provider, then kept in your Keychain. Sent nowhere else."}
      </Text>
    </form>
  );
}

/** One key field per API-key provider (V1-9), under the provider cards: a card can't be chosen until its key is kept. */
export function ProviderKeys({ state, onSave, onForget }: Props) {
  return (
    <Flex direction="column" gap="3">
      {KEYED_PROVIDER_IDS.map((id) => {
        const status = state.providers.find((p) => p.id === id);
        return status ? <KeyField key={id} id={id} label={`${status.label.replace(" (API key)", "")} API key`} ready={status.ready} onSave={onSave} onForget={onForget} /> : null;
      })}
    </Flex>
  );
}
