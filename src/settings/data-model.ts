import { WIPE_PHRASE, type DataPreviewDto } from "../../shared/data";

const KB = 1024;
const MB = KB * KB;

export function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`;
  return `${bytes} B`;
}

const plural = (count: number, one: string, many = `${one}s`): string => `${count} ${count === 1 ? one : many}`;

/** The consequences, in words and with real counts, before the person types the phrase. */
export function wipeLines(preview: DataPreviewDto): string[] {
  const { counts, files } = preview;
  const rows = [plural(counts.tasks, "task") + " (done ones too)", plural(counts.parked, "parked idea"), plural(counts.messages, "message"), plural(counts.documents, "document"), plural(counts.skills, "skill of yours", "skills of yours")];
  const names = files.map((file) => `${file.name} (${formatBytes(file.bytes)})`);
  return [`Deletes ${rows.join(", ")}.`, names.length ? `Removes from the data folder: ${names.join(", ")}.` : "The data folder is already empty.", "Disconnects Gmail. How Heel looks and how Greg behaves stay as they are.", "This cannot be undone. Back up first if in doubt."];
}

/** The phrase must match exactly, as typed; surrounding spaces are forgiven, capitals are not. */
export const confirmsWipe = (typed: string): boolean => typed.trim() === WIPE_PHRASE;
