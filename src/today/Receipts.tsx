import { CheckIcon, ChevronDownIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Button, Text } from "@radix-ui/themes";
import { Collapsible } from "radix-ui";
import { receiptSummary, type Receipt } from "./thread-model";

type Props = { receipts: readonly Receipt[]; onUndo: (index: number) => void };

/** What Heel did, folded to one line. Failures are named in the summary and open by default; each undoable write has its own Undo. */
export function Receipts({ receipts, onUndo }: Props) {
  if (receipts.length === 0) return null;
  const { text, hasFailure } = receiptSummary(receipts);
  return (
    <Collapsible.Root defaultOpen={hasFailure} className="receipts">
      <Collapsible.Trigger asChild>
        <Button variant="ghost" size="1" color={hasFailure ? "amber" : "gray"}>
          {hasFailure ? <ExclamationTriangleIcon aria-hidden="true" /> : <CheckIcon aria-hidden="true" />}
          {text}
          <ChevronDownIcon aria-hidden="true" className="chevron" />
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <ul className="receipt-list">
          {receipts.map((receipt, index) => (
            <li key={`${index}-${receipt.text}`} data-undone={receipt.undone || undefined}>
              <Text size="1" color="gray" className="receipt-text">{receipt.text}</Text>
              {receipt.undone ? (
                <Text size="1" color="gray">Undone</Text>
              ) : (
                receipt.undo && <Button size="1" variant="ghost" onClick={() => onUndo(index)}>Undo</Button>
              )}
            </li>
          ))}
        </ul>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
