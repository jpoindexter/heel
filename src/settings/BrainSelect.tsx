import { Select, Text } from "@radix-ui/themes";
import type { BrainStateDto } from "../../shared/api";
import type { ProviderId } from "../../shared/providers";
import { brainGroups, optionValue, parseOption } from "./brain-model";

type Props = { state: BrainStateDto; onChoose: (provider: ProviderId, model: string | null) => void };

/** One selector for every AI: the subscriptions Heel detects, local models, and API keys, each provider's models as its options. */
export function BrainSelect({ state, onChoose }: Props) {
  const { provider, model } = state.settings;
  const choose = (value: string) => {
    const next = parseOption(value);
    if (next) onChoose(next.provider, next.model);
  };
  return (
    <div className="field">
      <Text as="label" size="2" weight="medium" id="brain-label">AI</Text>
      <Select.Root value={provider ? optionValue(provider, model) : ""} onValueChange={choose}>
        <Select.Trigger id="brain-select" aria-labelledby="brain-label" aria-describedby="brain-help" placeholder="Choose an AI" style={{ width: "100%" }} />
        <Select.Content position="popper" className="brain-select">
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
      <Text as="p" id="brain-help" size="1" color="gray">Subscriptions signed in on this Mac show as ready. Greyed entries say what they need.</Text>
    </div>
  );
}
