import { useCallback, useEffect, useState } from "react";
import { APPEARANCE_STORAGE_KEY, parsePreference, resolveAppearance, type Appearance, type Preference } from "./appearance";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readSaved(): Preference {
  try {
    return parsePreference(window.localStorage.getItem(APPEARANCE_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** The panel's light/dark choice. Saved per window; "system" tracks the Mac live. Storage may be unavailable, so it only ever remembers. */
export function useAppearance(): { preference: Preference; appearance: Appearance; setPreference: (next: Preference) => void } {
  const [preference, setPreferenceState] = useState<Preference>(readSaved);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const setPreference = useCallback((next: Preference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, next);
    } catch {
      /* not remembered this time */
    }
  }, []);

  return { preference, appearance: resolveAppearance(preference, systemDark), setPreference };
}
