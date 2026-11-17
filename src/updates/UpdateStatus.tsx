import { Button, Flex, Text } from "@radix-ui/themes";
import type { Updates } from "./useUpdates";

export function UpdateStatus({ updates, compact = false }: { updates: Updates; compact?: boolean }) {
  if (compact && updates.phase === "idle") return null;
  const ready = updates.phase === "ready", busy = ["checking", "downloading", "installing"].includes(updates.phase);
  if (compact) return <Flex gap="2" align="center" justify="between" flexShrink="0" aria-label="App updates">
    <Text size="1" role="status" title={updates.message}>{({ checking: "Checking updates…", downloading: "Downloading update…", ready: "Update ready", installing: "Restarting…", error: "Update failed", idle: "" })[updates.phase]}</Text>
    {!busy && <Button size="1" variant="soft" aria-label={ready ? "Restart to update" : "Retry update"} onClick={() => void (ready ? updates.restart() : updates.checkNow())}>{ready ? "Restart" : "Retry"}</Button>}
  </Flex>;
  return <Flex direction="column" gap="2" flexShrink="0" aria-label="App updates">
    <Text size="1" color="gray" role="status">{updates.message}</Text>
    <Button size="1" variant="soft" disabled={busy} onClick={() => void (ready ? updates.restart() : updates.checkNow())}>
      {ready ? "Restart to update" : busy ? "Please wait…" : "Check for updates"}
    </Button>
  </Flex>;
}
