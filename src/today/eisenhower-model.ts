import type { Structure } from "../../shared/method";

export const DROP = "drop";

/** Eisenhower's Drop is not a fourth group: a task that lands on it leaves the list (the remove path, with its Undo). */
export const dropsOnBucket = (structure: Structure, bucket: string | null): boolean => structure === "eisenhower" && bucket === DROP;
