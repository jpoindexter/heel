import { useState } from "react";
import { Select, Text, TextField } from "@radix-ui/themes";
import { modelToCommit, type ModelControl } from "./brain-model";

/** Radix Select can't hold an empty value, so "provider default" travels as this word and becomes null on the way out. */
const DEFAULT_CHOICE = "__provider-default__";
const HELPER_ID = "model-helper";

type Props = { control: Exclude<ModelControl, { kind: "none" }>; onCommit: (model: string | null) => void };

function ModelSelect({ control, onCommit }: { control: Extract<ModelControl, { kind: "select" }>; onCommit: Props["onCommit"] }) {
  const value = control.required ? (control.value ?? "") : (control.value ?? DEFAULT_CHOICE);
  return (
    <>
      <Text as="label" size="2" weight="medium" id="model-label">Model</Text>
      <Select.Root value={value} onValueChange={(next) => onCommit(next === DEFAULT_CHOICE ? null : next)}>
        <Select.Trigger id="model" aria-labelledby="model-label" aria-describedby={HELPER_ID} placeholder="Choose a model" />
        <Select.Content>
          {!control.required && <Select.Item value={DEFAULT_CHOICE}>Provider default</Select.Item>}
          {control.options.map((name) => (
            <Select.Item key={name} value={name}>{name}</Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Text as="p" id={HELPER_ID} size="1" color="gray">
        {control.required ? "Local models only appear here once Ollama reports them." : "Optional. Leave on the default if unsure."}
      </Text>
    </>
  );
}

function ModelText({ control, onCommit }: { control: Extract<ModelControl, { kind: "text" }>; onCommit: Props["onCommit"] }) {
  const [draft, setDraft] = useState(control.value);
  const commit = () => {
    const next = modelToCommit(draft, control.value);
    if (next !== undefined) onCommit(next);
  };
  return (
    <>
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
    </>
  );
}

export function ModelField({ control, onCommit }: Props) {
  return (
    <div className="field">
      {control.kind === "select" ? <ModelSelect control={control} onCommit={onCommit} /> : <ModelText control={control} onCommit={onCommit} />}
    </div>
  );
}
