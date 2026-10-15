/**
 * Files that still contain hard-coded design values, with the most hits they may have.
 * Shrink-only, like size-allowlist.ts. Everything visual must come from tokens (Radix Theme variables and src/design/tokens.css).
 * Sprite geometry lives in src/mascot/atlas.ts as named constants (cell size, columns), which is data, not styling.
 */
export const DESIGN_ALLOWLIST: Readonly<Record<string, number>> = {};
