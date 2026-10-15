export const PREFERENCES = ["system", "light", "dark"] as const;
export type Preference = (typeof PREFERENCES)[number];
export type Appearance = "light" | "dark";

export const APPEARANCE_STORAGE_KEY = "heel:appearance";

export function isPreference(value: unknown): value is Preference {
  return typeof value === "string" && (PREFERENCES as readonly string[]).includes(value);
}

/** What was saved, or "system" when nothing usable was (private window, cleared storage, a value from a future version). */
export function parsePreference(raw: string | null): Preference {
  return isPreference(raw) ? raw : "system";
}

/** "system" follows the Mac's light/dark setting; the other two are the person's explicit choice. */
export function resolveAppearance(preference: Preference, systemPrefersDark: boolean): Appearance {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}
