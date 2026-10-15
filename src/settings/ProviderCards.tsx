import { Badge, Flex, RadioCards, Text } from "@radix-ui/themes";
import type { BrainStateDto } from "../../shared/api";
import type { ProviderId } from "../../shared/providers";
import { providerRows } from "./brain-model";

type Props = { state: BrainStateDto; onChoose: (id: ProviderId) => void };

/** One card per AI provider; a provider that isn't ready can't be chosen and says why. */
export function ProviderCards({ state, onChoose }: Props) {
  return (
    <RadioCards.Root columns="1" gap="2" aria-label="AI provider" value={state.settings.provider ?? ""} onValueChange={(id) => onChoose(id as ProviderId)}>
      {providerRows(state).map((row) => (
        <RadioCards.Item key={row.id} value={row.id} disabled={!row.ready}>
          <Flex direction="column" gap="1" width="100%">
            <Text size="2" weight="medium">{row.label}</Text>
            <Flex align="center" gap="2" wrap="wrap">
              <Badge color={row.ready ? "jade" : "amber"}>{row.statusText}</Badge>
              <Text size="1" color="gray">{row.detail}</Text>
            </Flex>
          </Flex>
        </RadioCards.Item>
      ))}
    </RadioCards.Root>
  );
}
