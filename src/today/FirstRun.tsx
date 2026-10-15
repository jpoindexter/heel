import { Badge, Button, Heading, Text } from "@radix-ui/themes";
import type { BrainSummary } from "../settings/brain-summary";

type Props = { summary: Extract<BrainSummary, { kind: "setup" }>; onOpenSettings: () => void };

/** Shown instead of a dead text box until an AI is chosen and ready. Two steps; the first has the one button that fixes it. */
export function FirstRun({ summary, onOpenSettings }: Props) {
  return (
    <section aria-labelledby="first-run-heading" className="first-run">
      <Heading as="h2" id="first-run-heading" size="3">Set up Heel</Heading>
      <ol>
        <li>
          <Badge color="amber" highContrast radius="full" aria-hidden="true">1</Badge>
          <div>
            <Text as="p" size="2" weight="medium">Pick your AI</Text>
            <Text as="p" size="2" color="gray">
              {summary.reason === "none" ? "Heel needs one to answer. Local keeps everything on this Mac." : summary.detail}
            </Text>
            <Button size="2" highContrast onClick={onOpenSettings}>Choose AI</Button>
          </div>
        </li>
        <li>
          <Badge color="gray" highContrast radius="full" aria-hidden="true">2</Badge>
          <div>
            <Text as="p" size="2" weight="medium">Say what's on your mind</Text>
            <Text as="p" size="2" color="gray">Type below. Heel turns it into one small first step.</Text>
          </div>
        </li>
      </ol>
    </section>
  );
}
