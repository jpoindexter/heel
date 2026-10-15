import { receiptSummary, type Receipt } from "./thread-model";

type Props = { receipts: readonly Receipt[]; onUndo: (index: number) => void };

/** What Heel did, folded to one line. Failures are named in the summary and open by default; each undoable write has its own Undo. */
export function Receipts({ receipts, onUndo }: Props) {
  if (receipts.length === 0) return null;
  const { text, hasFailure } = receiptSummary(receipts);
  return (
    <details className="receipts" data-failure={hasFailure || undefined} open={hasFailure}>
      <summary>
        <span className="mark" data-ready={!hasFailure} aria-hidden="true">{hasFailure ? "!" : "✓"}</span>
        {text}
      </summary>
      <ul>
        {receipts.map((receipt, index) => (
          <li key={`${index}-${receipt.text}`} data-ok={receipt.ok} data-undone={receipt.undone || undefined}>
            <span>{receipt.text}</span>
            {receipt.undone ? (
              <span className="helper">Undone</span>
            ) : (
              receipt.undo && <button type="button" className="button button-quiet" onClick={() => onUndo(index)}>Undo</button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
