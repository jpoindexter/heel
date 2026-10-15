import { ChevronRightIcon } from "@radix-ui/react-icons";
import { Text } from "@radix-ui/themes";
import { latestExchange, type Message } from "./thread-model";

/** The way back to the last exchange once its layer is closed: one quiet row at the top of the list. */
export function ReplyRow({ messages, onOpen }: { messages: readonly Message[]; onOpen: () => void }) {
  const exchange = latestExchange(messages);
  if (!exchange) return null;
  return (
    <button type="button" className="reply-row" onClick={onOpen}>
      <Text size="1" color="gray" className="reply-row-label">Last reply</Text>
      <Text size="2" className="grow clamp-1">{exchange.asked ?? "Heel"}</Text>
      <ChevronRightIcon aria-hidden="true" className="receipt-icon" />
    </button>
  );
}
