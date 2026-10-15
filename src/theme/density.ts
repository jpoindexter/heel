export const DENSITIES = ["compact", "comfortable"] as const;
export type Density = (typeof DENSITIES)[number];

export const DENSITY_STORAGE_KEY = "heel:density";

/** Compact is the default: small is the point. Radix scales every size, space and font from this one value. */
export const DEFAULT_DENSITY: Density = "compact";

export const SCALING: Record<Density, "90%" | "100%"> = { compact: "90%", comfortable: "100%" };

export function isDensity(value: unknown): value is Density {
  return typeof value === "string" && (DENSITIES as readonly string[]).includes(value);
}

/** What was saved, or the default when nothing usable was. */
export function parseDensity(raw: string | null): Density {
  return isDensity(raw) ? raw : DEFAULT_DENSITY;
}
