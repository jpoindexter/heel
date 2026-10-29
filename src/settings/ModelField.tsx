import { useState } from "react";
import { Text, TextField } from "@radix-ui/themes";
import { modelToCommit } from "./brain-model";

const HELPER_ID = "model-helper";

type Props = { value: string; onCommit: (model: string | null) => void };

/** Free-text model for a provider that reports no list (the CLIs): empty means the provider's own default. */
export function ModelField({ value, onCommit }: Props) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    const next = modelToCommit(draft, value);
    if (next !== undefined) onCommit(next);
  };
  return (
    <div className="field">
      <Text as="label" size="2" weight="medium" htmlFor="model">Model (optional)</Text>
      <TextField.Root
        id="model"
        value={draft}
        aria-describedby={HELPER_ID}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
      <Text as="p" id={HELPER_ID} size="1" color="gray">Leave empty to use the provider's default.</Text>
    </div>
  );
}
