import { useCallback, useEffect, useState } from "react";
import { DENSITY_STORAGE_KEY, parseDensity, type Density } from "./density";

function readSaved(): Density {
  try {
    return parseDensity(window.localStorage.getItem(DENSITY_STORAGE_KEY));
  } catch {
    return parseDensity(null);
  }
}

/** Compact or comfortable, remembered per window. Changing it in Settings reaches the open panel at once through the storage event. */
export function useDensity(): [Density, (next: Density) => void] {
  const [density, setDensityState] = useState<Density>(readSaved);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => event.key === DENSITY_STORAGE_KEY && setDensityState(parseDensity(event.newValue));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
    } catch {
      /* not remembered this time */
    }
  }, []);

  return [density, setDensity];
}
