/** "Aoi Tanaka <aoi@example.com>" → "Aoi Tanaka"; a bare address stays as it is. */
export function recipientName(from: string): string {
  const name = from.replace(/<[^>]*>/g, "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
  return name || from.trim();
}

export function sentNotice(from: string): string {
  return `Sent to ${recipientName(from)}`;
}

export const MAX_INSTRUCTION = 2000;

/** What to ask for before drafting: a few words from the person, never an empty draft. */
export function instructionFromInput(typed: string): string | null {
  const text = typed.replace(/\s+/g, " ").trim().slice(0, MAX_INSTRUCTION);
  return text.length > 0 ? text : null;
}
