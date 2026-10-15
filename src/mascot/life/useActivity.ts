import { useCallback, useEffect, useState } from "react";
import { ACTIVITY_STORAGE_KEY, parseActivity } from "./activity";
import type { Activity } from "./config";

function readSaved(): Activity {
  try {
    return parseActivity(window.localStorage.getItem(ACTIVITY_STORAGE_KEY));
  } catch {
    return parseActivity(null);
  }
}

/**
 * Greg's activity level, shared by the panel (where it is chosen) and the mascot window (where it is used):
 * both windows share one origin, so a change in one arrives in the other as a `storage` event.
 */
export function useActivity(): [Activity, (next: Activity) => void] {
  const [activity, setActivity] = useState<Activity>(readSaved);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_STORAGE_KEY) setActivity(parseActivity(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const change = useCallback((next: Activity) => {
    setActivity(next);
    try {
      window.localStorage.setItem(ACTIVITY_STORAGE_KEY, next);
    } catch {
      /* not remembered this time */
    }
  }, []);

  return [activity, change];
}
