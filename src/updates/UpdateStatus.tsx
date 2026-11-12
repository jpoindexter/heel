import { Button, Flex, Text } from "@radix-ui/themes";
import type { Updates } from "./useUpdates";

export function UpdateStatus({ updates, compact = false }: { updates: Updates; compact?: boolean }) {
  if (compact && updates.phase !== "ready" && updates.phase !== "installing") return null;
  const ready = updates.phase === "ready", busy = ["checking", "downloading", "installing"].includes(updates.phase);
  return <Flex direction="column" gap="2" aria-label="App updates">
    <Text size="1" color="gray" role="status">{updates.message}</Text>
    <Button size="1" variant="soft" disabled={busy} onClick={() => void (ready ? updates.restart() : updates.checkNow())}>
      {ready ? "Restart to update" : busy ? "Please wait…" : "Check for updates"}
    </Button>
  </Flex>;
}
