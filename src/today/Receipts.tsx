import { ApplicationLink } from "../applications/ApplicationLink";
import { CheckIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Button, Text } from "@radix-ui/themes";
import type { AppKind } from "../../shared/api";
import type { Receipt } from "./thread-model";

/** The one tap that writes to the person's app (N26). */
const ADD_TO: Record<AppKind, string> = { event: "Add to Calendar", reminder: "Add to Reminders", note: "Add to Notes" };

type Props = { receipts: readonly Receipt[]; onUndo: (index: number) => void; /** A saved document (or its PDF) can be opened from its line (N15). */ onOpen?: (documentId: string, file: "md" | "pdf") => void; /** A message Heel named opens in Mail from its line (N26). */ onOpenMail?: (messageId: string) => void; /** A proposed write to Calendar, Reminders or Notes happens only on this tap (N26). */ onConfirm?: (index: number) => void };

/** What Heel did, one quiet line each, always visible. Each undoable write has its own Undo; a failure is named, never hidden. */
export function Receipts({ receipts, onUndo, onOpen, onOpenMail, onConfirm }: Props) {
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
            <>
              {receipt.application && <ApplicationLink />}
              {receipt.document && onOpen && <Button size="1" variant="ghost" aria-label={`Open: ${receipt.text}`} onClick={() => onOpen(receipt.document!, receipt.file ?? "md")}>Open</Button>}
              {receipt.mail && onOpenMail && <Button size="1" variant="ghost" aria-label={`Open in Mail: ${receipt.text}`} onClick={() => onOpenMail(receipt.mail!)}>Open in Mail</Button>}
              {receipt.proposal && onConfirm && <Button size="1" variant="soft" onClick={() => onConfirm(index)}>{ADD_TO[receipt.proposal.kind]}</Button>}
              {receipt.undo && <Button size="1" variant="ghost" aria-label={`Undo: ${receipt.text}`} onClick={() => onUndo(index)}>Undo</Button>}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
