import { CheckIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Button, Text } from "@radix-ui/themes";
import type { Receipt } from "./thread-model";

type Props = { receipts: readonly Receipt[]; onUndo: (index: number) => void };

/** What Heel did, one quiet line each, always visible. Each undoable write has its own Undo; a failure is named, never hidden. */
export function Receipts({ receipts, onUndo }: Props) {
  if (receipts.length === 0) return null;
  return (
    <ul className="receipt-list" aria-label="What Heel did">
      {receipts.map((receipt, index) => (
        <li key={`${index}-${receipt.text}`} data-undone={receipt.undone || undefined}>
          {receipt.ok ? <CheckIcon aria-hidden="true" className="receipt-icon" /> : <ExclamationTriangleIcon aria-hidden="true" className="receipt-icon receipt-warn" />}
          <Text size="1" color={receipt.ok ? "gray" : "amber"} className="receipt-text grow">{receipt.text}</Text>
          {receipt.undone ? (
            <Text size="1" color="gray">Undone</Text>
          ) : (
            receipt.undo && <Button size="1" variant="ghost" onClick={() => onUndo(index)}>Undo</Button>
          )}
        </li>
      ))}
    </ul>
  );
}
