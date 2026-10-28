/** Today's capacity (V1-7): set by the person, never inferred. Low keeps the list to one thing; Off is Low with nothing optional. */
export const CAPACITIES = ["normal", "low", "off"] as const;
export type Capacity = (typeof CAPACITIES)[number];

export const CAPACITY_STORAGE_KEY = "heel:capacity";
export const DEFAULT_CAPACITY: Capacity = "normal";

export function isCapacity(value: unknown): value is Capacity {
  return typeof value === "string" && (CAPACITIES as readonly string[]).includes(value);
}

/** What was saved, or Normal when nothing usable was (cleared storage, a value from another version). */
export function parseCapacity(raw: string | null): Capacity {
  return isCapacity(raw) ? raw : DEFAULT_CAPACITY;
}

/** Low and Off both cut the panel down to the one thing; Off also stills Greg and the nudges. */
export const isReduced = (capacity: Capacity): boolean => capacity !== "normal";

/** The line that stands where the rest of the list was, so the short list is a choice on show, not a loss. */
export function reducedLine(capacity: Capacity, waiting: number): string {
  const head = capacity === "off" ? "Off today: one thing, nothing else." : "Low capacity today: one thing at a time.";
  if (waiting <= 0) return head;
  return `${head} ${waiting} more ${waiting === 1 ? "waits" : "wait"}.`;
}
