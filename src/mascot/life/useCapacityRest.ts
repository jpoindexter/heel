import { useEffect, useRef } from "react";
import type { Capacity } from "../../ui/capacity";

type Life = { nap: () => void; wake: () => void };

/** A Low or Off day sends Greg to rest (a quiet presence, nothing more); back to Normal gets him up. Only on a change: never on mount. */
export function useCapacityRest(capacity: Capacity, life: Life): void {
  const seen = useRef(capacity);
  useEffect(() => {
    if (seen.current === capacity) return;
    seen.current = capacity;
    if (capacity === "normal") life.wake();
    else life.nap();
  }, [capacity, life]);
}
