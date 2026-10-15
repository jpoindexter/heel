import { Button, Text } from "@radix-ui/themes";
import type { BrainSummary } from "../settings/brain-summary";

type Props = { summary: Extract<BrainSummary, { kind: "setup" }>; onOpenSettings: () => void };

/** Asking needs an AI; adding and parking do not. One line, with the one button that fixes it. */
export function FirstRun({ summary, onOpenSettings }: Props) {
  return (
    <div className="first-run">
      <Text size="2" color="gray" className="grow">
        {summary.reason === "none" ? "Pick an AI to ask Heel. Local keeps everything on this Mac." : summary.detail}
      </Text>
      <Button size="1" variant="soft" onClick={onOpenSettings}>Choose AI</Button>
    </div>
  );
}
