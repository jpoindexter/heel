import { useState } from "react";
import { Select, Text } from "@radix-ui/themes";
import type { BrainStateDto } from "../../shared/api";
import { isKeyedProvider, type ProviderId } from "../../shared/providers";
import { useNotices } from "../ui/notices";
import { brainGroups, labelFor, optionValue, parseOption } from "./brain-model";

type Props = { state: BrainStateDto; onChoose: (provider: ProviderId, model: string | null) => void; onSetup: () => void };

/** One selector for every AI: the subscriptions Heel detects, local models, and API keys, each provider's models as its options. */
export function BrainSelect({ state, onChoose, onSetup }: Props) {
  const { provider, model } = state.settings;
  const [open, setOpen] = useState(false);
  const { show: notify } = useNotices();
  // A toast that appears while the list is open becomes Radix's top layer and takes Esc; close the list ourselves and mark the key handled.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setOpen(false);
  };
  const choose = (value: string) => {
    const next = parseOption(value);
    if (!next) return;
    if (isKeyedProvider(next.provider) && !state.providers.find((p) => p.id === next.provider)?.ready) {
      onSetup();
      notify({ message: `${labelFor(state, next.provider)} needs a key. Add it below; your selected AI is unchanged.`, tone: "info" });
    } else onChoose(next.provider, next.model);
  };
  return (
    <div className="field">
      <Text as="label" size="2" weight="medium" id="brain-label">AI</Text>
      <Select.Root value={provider ? optionValue(provider, model) : ""} onValueChange={choose} open={open} onOpenChange={setOpen}>
        <Select.Trigger id="brain-select" aria-labelledby="brain-label" aria-describedby="brain-help" placeholder="Choose an AI" style={{ width: "100%" }} />
        <Select.Content position="popper" className="brain-select" onKeyDown={onKeyDown}>
          {brainGroups(state).map((group) => (
            <Select.Group key={group.id}>
              <Select.Label>{`${group.label} · ${group.ready ? group.detail : "Needs setup"}`}</Select.Label>
              {group.options.map((option) => (
                <Select.Item key={option.value} value={option.value} disabled={option.disabled}>{option.label}</Select.Item>
              ))}
            </Select.Group>
          ))}
        </Select.Content>
      </Select.Root>
      <Text as="p" id="brain-help" size="1" color="gray">Subscriptions signed in on this Mac show as ready. API-key entries open setup; greyed entries say what they need.</Text>
    </div>
  );
}
