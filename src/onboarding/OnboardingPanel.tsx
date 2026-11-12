import { useEffect, useRef, useState } from "react";
import { Button, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { BrainSettings } from "../settings/BrainSettings";
import { useLayers } from "../ui/layers";
import { useOnboarding, type Onboarding } from "./onboarding";

function FirstTask({ setup, onAdded }: { setup: Onboarding; onAdded: () => void }) {
  const key = "heel:onboarding-task-draft";
  const [title, setTitle] = useState(() => { try { return (localStorage.getItem(key) ?? "").slice(0, 500); } catch { return ""; } });
  useEffect(() => { try { localStorage.setItem(key, title); } catch { /* the task can still be captured */ } }, [title]);
  if (setup.state?.taskId) return <><Text as="p">You’ve already tried capturing a task. Your own tasks stay in Today.</Text><Button onClick={() => void setup.move(1)} disabled={setup.busy}>Continue</Button></>;
  return <form className="settings-section" onSubmit={event => { event.preventDefault(); void setup.capture(title).then(ok => { if (ok) { try { localStorage.removeItem(key); } catch { /* storage may be unavailable */ } onAdded(); } }); }}>
    <Heading as="h3" size="3">Give Heel one thing to hold</Heading>
    <Text as="p" size="2">A task or reminder is enough. It stays on this Mac; no AI is needed to add it.</Text>
    <Text as="label" htmlFor="first-task" size="2">Your first task</Text>
    <TextField.Root id="first-task" value={title} maxLength={500} required placeholder="Something you want to remember" onChange={event => setTitle(event.target.value)} disabled={setup.busy} />
    <Button type="submit" disabled={setup.busy || !title.trim()}>Add task</Button>
    <Button type="button" variant="ghost" disabled={setup.busy} onClick={() => void setup.move(1)}>Do this later</Button>
  </form>;
}

function Ready() {
  return <>
    <Heading as="h3" size="3">You’re ready</Heading>
    <Text as="p" size="2">Click Greg to open or hide this panel. Add and find your tasks on Today.</Text>
    <Text as="p" size="2">Ask Heel for help in the box below. Review its suggestions and correct anything it gets wrong.</Text>
    <Text as="p" size="2">Job applications fills from your facts and CV. You review the answers and approve outgoing site requests.</Text>
    <Text as="p" size="2">Something broke? Settings › About lets you send a report directly from Heel.</Text>
  </>;
}

export function OnboardingPanel({ onChanged }: { onChanged: () => void }) {
  const setup = useOnboarding(), layers = useLayers();
  const heading = useRef<HTMLHeadingElement>(null);
  const step = setup.state?.step ?? 0;
  useEffect(() => { heading.current?.focus(); }, [step]);
  const finish = () => void setup.move(3).then(ok => { if (ok) layers.home(); });
  return <section className="settings settings-section" aria-label="Set up Heel" aria-busy={setup.busy}>
    <Heading ref={heading} tabIndex={-1} as="h2" size="2">Step {Math.min(step + 1, 3)} of 3</Heading>
    <Button variant="ghost" size="1" onClick={finish} disabled={setup.busy}>Skip setup</Button>
    {setup.problem && <Text as="p" color="amber" role="alert">{setup.problem} Your task and setup progress are kept. Try again.</Text>}
    {step === 0 && <FirstTask setup={setup} onAdded={onChanged} />}
    {step === 1 && <><Heading as="h3" size="3">Choose your AI</Heading><Text as="p" size="2">Use an AI you already have, or keep adding tasks without one.</Text><BrainSettings active onSaved={onChanged} /><Button disabled={setup.busy} onClick={() => void setup.move(2)}>Continue</Button></>}
    {step >= 2 && <><Ready /><Button disabled={setup.busy} onClick={finish}>Start using Heel</Button></>}
    {step > 0 && <Flex><Button variant="soft" disabled={setup.busy} onClick={() => void setup.move(step - 1)}>Previous step</Button></Flex>}
  </section>;
}
