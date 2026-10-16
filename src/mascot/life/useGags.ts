import { useCallback, useState } from "react";
import { GAGS_STORAGE_KEY } from "./useIdleLife";

const read = (): boolean => {
  try {
    return window.localStorage.getItem(GAGS_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
};

/** The bathroom gags switch (opt-in). The mascot window reads the key on every tick, so no event is needed. */
export function useGags(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(read);
  const change = useCallback((next: boolean) => {
    setOn(next);
    try {
      window.localStorage.setItem(GAGS_STORAGE_KEY, next ? "on" : "off");
    } catch {
      /* not remembered this time */
    }
  }, []);
  return [on, change];
}
