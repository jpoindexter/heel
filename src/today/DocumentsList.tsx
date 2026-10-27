import { Cross2Icon, FileTextIcon } from "@radix-ui/react-icons";
import { Button, IconButton, Text } from "@radix-ui/themes";
import type { useDocuments } from "./useDocuments";

/** What Heel wrote, newest first: open it, make or open its PDF, reveal it in Finder, or take it off the list (the file stays; Undo brings it back). */
export function DocumentsList({ documents }: { documents: ReturnType<typeof useDocuments> }) {
  if (documents.documents.length === 0 && !documents.problem) return null;
  return (
    <section className="history-day" aria-label="Documents">
      <Text size="1" weight="medium" color="gray" className="section-label">Documents</Text>
      {documents.problem && <Text as="p" size="2" color="amber" role="alert">{documents.problem}</Text>}
      <ul className="rows">
        {documents.documents.map((doc) => (
          <li key={doc.id} className="task-row history-row">
            <FileTextIcon aria-hidden="true" className="receipt-icon" />
            <Text size="2" className="grow task-text clamp-1">{doc.title}</Text>
            <Button size="1" variant="ghost" color="gray" className="row-action" aria-label={`Open: ${doc.title}`} onClick={() => void documents.open(doc.id)}>Open</Button>
            <Button size="1" variant="ghost" color="gray" className="row-action" aria-label={doc.pdfPath ? `Open the PDF: ${doc.title}` : `Make a PDF: ${doc.title}`} onClick={() => void (doc.pdfPath ? documents.open(doc.id, { file: "pdf" }) : documents.pdf(doc))}>PDF</Button>
            <Button size="1" variant="ghost" color="gray" className="row-action" aria-label={`Show in Finder: ${doc.title}`} onClick={() => void documents.open(doc.id, { reveal: true })}>Finder</Button>
            <IconButton size="1" variant="ghost" color="gray" className="row-action" aria-label={`Remove from the list: ${doc.title}`} onClick={() => void documents.remove(doc)}>
              <Cross2Icon aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
