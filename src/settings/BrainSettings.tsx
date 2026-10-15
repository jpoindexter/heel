import { Button, Callout, Flex, Heading, Text } from "@radix-ui/themes";
import { client } from "../api/default-client";
import { Notifier } from "../ui/Notifier";
import { modelControl } from "./brain-model";
import { ModelField } from "./ModelField";
import { ProviderCards } from "./ProviderCards";
import { useBrain } from "./useBrain";

type Props = { active: boolean; onSaved?: () => void };

export function BrainSettings({ active, onSaved }: Props) {
  const brain = useBrain(client, active, onSaved);
  const { view, notice, test } = brain;
  const ready = view.phase === "ready" ? view : null;
  const control = ready ? modelControl(ready.state.settings.provider, ready.models, ready.state.settings.model) : null;

  return (
    <section aria-labelledby="brain-heading" className="settings-section">
      <Heading as="h2" id="brain-heading" size="3">Brain</Heading>
      <Text as="p" size="2" color="gray">Pick the AI Heel uses. What you type goes to that provider. Local keeps it on this Mac.</Text>
      {view.phase === "loading" && <Text role="status" size="2">Checking your providers…</Text>}
      {view.phase === "error" && (
        <Callout.Root color="amber" role="alert" size="1">
          <Callout.Text>{view.message}</Callout.Text>
          <Button size="1" variant="soft" onClick={() => void brain.refresh()}>Try again</Button>
        </Callout.Root>
      )}
      {ready && (
        <>
          <ProviderCards state={ready.state} onChoose={(id) => void brain.choose(id)} />
          {control && control.kind !== "none" && (
            <ModelField key={`${ready.state.settings.provider}-${ready.state.settings.model}`} control={control} onCommit={(model) => void brain.setModel(model)} />
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
      <div className="toast-anchor">
        <Notifier notice={notice} onDismiss={brain.dismissNotice} />
      </div>
    </section>
  );
}
