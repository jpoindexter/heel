import { Button, Callout, Flex, Heading, Text } from "@radix-ui/themes";
import { client } from "../api/default-client";
import { modelText } from "./brain-model";
import { BrainSelect } from "./BrainSelect";
import { ModelField } from "./ModelField";
import { ProviderKeys } from "./ProviderKeys";
import { useBrain } from "./useBrain";

type Props = { active: boolean; onSaved?: () => void };

export function BrainSettings({ active, onSaved }: Props) {
  const brain = useBrain(client, active, onSaved);
  const { view, test } = brain;
  const ready = view.phase === "ready" ? view : null;
  const text = ready ? modelText(ready.state) : null;

  return (
    <section aria-labelledby="brain-heading" className="settings-section">
      <Heading as="h3" id="brain-heading" size="2">Brain</Heading>
      <Text as="p" size="1" color="gray">Pick the AI Heel uses. What you type goes to that provider. Local keeps it on this Mac.</Text>
      {view.phase === "loading" && <Text role="status" size="2">Checking your providers…</Text>}
      {view.phase === "error" && (
        <Callout.Root color="amber" role="alert" size="1" highContrast>
          <Callout.Text>{view.message}</Callout.Text>
          <Button size="1" variant="soft" onClick={() => void brain.refresh()}>Try again</Button>
        </Callout.Root>
      )}
      {ready && (
        <>
          <BrainSelect state={ready.state} onChoose={(provider, model) => void brain.choose(provider, model)} />
          <ProviderKeys state={ready.state} onSave={brain.saveKey} onForget={(id) => void brain.forgetKey(id)} />
          {text !== null && (
            <ModelField key={`${ready.state.settings.provider}-${ready.state.settings.model}`} value={text} onCommit={(model) => void brain.setModel(model)} />
          )}
          <Flex gap="2" wrap="wrap">
            <Button size="2" variant="soft" loading={test.phase === "running"} onClick={() => void brain.runTest()}>
              {test.phase === "running" ? "Testing…" : "Test connection"}
            </Button>
            <Button size="2" variant="ghost" onClick={() => void brain.refresh()}>Check again</Button>
          </Flex>
          <Text as="p" role="status" size="2" color={test.phase === "done" && !test.ok ? "amber" : "jade"}>
            {test.phase === "done" ? `${test.ok ? "✓" : "!"} ${test.message}` : ""}
          </Text>
        </>
      )}
    </section>
  );
}
