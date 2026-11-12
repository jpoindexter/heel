import { Switch, Text } from "@radix-ui/themes";
import type { Diagnostics } from "../../shared/reports";

export function DiagnosticChoices({ facts, events, disabled, onChange }: { facts: boolean; events: boolean; disabled: boolean; onChange: (facts: boolean, events: boolean) => void }) {
  return <>
    <Text as="label" size="2"><Switch size="1" checked={facts} disabled={disabled} onCheckedChange={value => onChange(value, events)} /> Include diagnostic facts: version, Mac, helper and counts</Text>
    <Text as="label" size="2"><Switch size="1" checked={events} disabled={disabled || !facts} onCheckedChange={value => onChange(facts, value)} /> Include recent app events</Text>
    <Text as="p" size="1" color="gray">App events contain times and event categories. Tasks, chats, mail, CV contents, file paths and raw errors stay on this Mac.</Text>
  </>;
}
export const chosenDiagnostics = (diagnostics: Diagnostics | null, facts: boolean, events: boolean): Diagnostics | null => facts && diagnostics ? { ...diagnostics, events: events ? diagnostics.events : [] } : null;
