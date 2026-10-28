import { useSyncExternalStore } from "react";
import { CAPACITY_STORAGE_KEY, parseCapacity, type Capacity } from "./capacity";

function readSaved(): Capacity {
  try {
    return parseCapacity(window.localStorage.getItem(CAPACITY_STORAGE_KEY));
  } catch {
    return parseCapacity(null);
  }
}

/* One value per window: the list, the bar and Settings all read it, so a change must reach them at once.
   A `storage` event only reaches the other windows (Greg's), never the one that wrote. */
let current = readSaved();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== CAPACITY_STORAGE_KEY) return;
    current = parseCapacity(event.newValue);
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setCapacity(next: Capacity): void {
  current = next;
  try {
    window.localStorage.setItem(CAPACITY_STORAGE_KEY, next);
  } catch {
    /* not remembered this time */
  }
  for (const listener of listeners) listener();
}

/** Today's capacity, chosen in Settings and read by the list, the bar and Greg's window (which hears it as a `storage` event). */
export function useCapacity(): [Capacity, (next: Capacity) => void] {
  return [useSyncExternalStore(subscribe, () => current), setCapacity];
}
