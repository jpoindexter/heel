import { Button, Callout } from "@radix-ui/themes";
import { helperNotice, type HelperStatus } from "./status";

type Props = { status: HelperStatus; error: string | null; onRestart: () => void };

/** Shown only when the helper is not running: what is wrong, in words, and one button to fix it. */
export function HelperNotice({ status, error, onRestart }: Props) {
  const notice = helperNotice(status);
  if (!notice) return null;
  return (
    <Callout.Root color={status.state === "stopped" ? "amber" : "gray"} role="status" size="1" highContrast className="helper-notice">
      <Callout.Text>{error ?? notice.text}</Callout.Text>
      {notice.canRestart && <Button size="1" variant="soft" onClick={onRestart}>Restart helper</Button>}
    </Callout.Root>
  );
}
