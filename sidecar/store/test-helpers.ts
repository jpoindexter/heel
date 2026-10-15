import { openStore, type StoreOptions } from "./store";

/** In-memory store with a clock that ticks 1s per call and predictable ids (id-1, id-2, ...). */
export function testStore(options: StoreOptions = {}) {
  let time = 1_000;
  let counter = 0;
  return openStore({ now: () => (time += 1_000), newId: () => `id-${++counter}`, ...options });
}
